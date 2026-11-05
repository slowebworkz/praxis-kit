// Packed-tarball smoke test for praxis-kit-diagnostics.
//
// Builds and packs the real tarball, inspects what is in it, then installs it into an isolated
// consumer outside this workspace and uses it the way a consumer would. Source-level tests cannot
// show that the published artifact is self-contained: that no bare `@praxis-kit/*` import survived
// bundling, that the schema and contract assets made it into the tarball, or that the bin runs.
//
// Run: pnpm --filter praxis-kit-diagnostics test:pack
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd: string, args: string[], cwd: string, allowFailure = false) {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} failed (exit ${result.status})\n${result.stdout}\n${result.stderr}`,
    )
  }
  return result
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`smoke-test: ${message}`)
}

function main(): void {
  console.log('smoke-test: building …')
  run('pnpm', ['build'], PKG_DIR)

  const work = mkdtempSync(join(tmpdir(), 'praxis-diagnostics-smoke-'))
  try {
    const packed = run('pnpm', ['pack', '--pack-destination', work, '--json'], PKG_DIR)
    const tarball = (JSON.parse(packed.stdout) as { filename: string }).filename

    // ── 1. What is in the tarball ────────────────────────────────────────────
    const listing = run('tar', ['-tzf', tarball], work).stdout.split('\n').filter(Boolean)
    const files = listing.map((f) => f.replace(/^package\//, ''))
    const contract = JSON.parse(
      readFileSync(join(PKG_DIR, 'contract', 'diagnostics.contract.json'), 'utf8'),
    ) as {
      contract: number
    }
    const required = [
      'package.json',
      'dist/index.js',
      'dist/index.d.ts',
      'dist/en.js',
      'dist/en.json',
      'dist/contract.js',
      'dist/cli.js',
      'dist/diagnostics.contract.json',
      'dist/schema.json',
      `dist/catalog.v${contract.contract}.schema.json`,
    ]
    for (const file of required) assert(files.includes(file), `the tarball is missing ${file}`)
    console.log(
      `smoke-test: tarball has all ${required.length} required files (${files.length} total)`,
    )

    // ── 2. The artifact is self-contained ───────────────────────────────────
    run('tar', ['-xzf', tarball, '-C', work], work)
    const pkg = JSON.parse(readFileSync(join(work, 'package', 'package.json'), 'utf8')) as Record<
      string,
      unknown
    >
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
      assert(
        pkg[field] === undefined,
        `package.json declares ${field}; this package must have none`,
      )
    }
    const bare = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]@praxis-kit\//
    const dist = files.filter((f) => /^dist\/.*\.(js|d\.ts)$/.test(f))
    for (const file of dist) {
      const text = readFileSync(join(work, 'package', file), 'utf8')
      assert(
        !bare.test(text),
        `${file} imports @praxis-kit/* directly; it would not install on its own`,
      )
      assert(!text.includes('workspace:'), `${file} mentions a workspace: specifier`)
    }
    console.log(`smoke-test: ${dist.length} JS/d.ts files have no @praxis-kit/* import`)

    // ── 3. An isolated consumer ─────────────────────────────────────────────
    const fixture = join(work, 'fixture')
    mkdirSync(fixture)
    run('npm', ['init', '-y'], fixture)
    run('npm', ['install', tarball, '--no-audit', '--no-fund'], fixture)
    const installed = JSON.parse(run('npm', ['ls', '--all', '--json'], fixture).stdout) as {
      dependencies?: Record<string, { dependencies?: object }>
    }
    const names = Object.keys(installed.dependencies ?? {})
    assert(
      names.length === 1 && names[0] === 'praxis-kit-diagnostics',
      `installed extra packages: ${names.join(', ')}`,
    )
    assert(
      Object.keys(installed.dependencies?.['praxis-kit-diagnostics']?.dependencies ?? {}).length ===
        0,
      'praxis-kit-diagnostics pulled in dependencies',
    )

    writeFileSync(
      join(fixture, 'check.mjs'),
      `import { createMessageResolver, checkCatalog, CONTRACT_VERSION } from 'praxis-kit-diagnostics'
import en from 'praxis-kit-diagnostics/en'
import contract from 'praxis-kit-diagnostics/contract'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const text = createMessageResolver(en)({ code: 'HTML3003', context: { tag: 'nav', implicitRole: 'navigation' } })
if (!text?.message?.includes('implicit role')) throw new Error('resolver did not render English')
const report = checkCatalog(en, contract)
if (report.errors.length > 0 || report.coverage.ratio !== 1) throw new Error('English did not validate')
if (CONTRACT_VERSION.major !== contract.contract) throw new Error('contract version mismatch')
for (const id of ['praxis-kit-diagnostics/schema.json', 'praxis-kit-diagnostics/catalog.v' + contract.contract + '.schema.json', 'praxis-kit-diagnostics/contract.json', 'praxis-kit-diagnostics/en.json']) {
  require(id)
}
console.log('consumer OK')
`,
    )
    console.log(run('node', ['check.mjs'], fixture).stdout.trim())

    // ── 4. The bin ──────────────────────────────────────────────────────────
    const bin = join(fixture, 'node_modules', '.bin', 'praxis-kit-diagnostics')
    const en = join(fixture, 'node_modules', 'praxis-kit-diagnostics', 'dist', 'en.json')
    const ok = run(bin, ['validate', en], fixture, true)
    assert(
      ok.status === 0 && ok.stdout.includes('Structurally valid.'),
      `the bin failed on en.json\n${ok.stdout}${ok.stderr}`,
    )
    const usage = run(bin, ['bogus'], fixture, true)
    assert(usage.status === 64, `the bin should exit 64 for bad usage, got ${usage.status}`)
    console.log('smoke-test: bin validates en.json (exit 0) and rejects bad usage (exit 64)')
    console.log('smoke-test: all checks passed')
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

main()
