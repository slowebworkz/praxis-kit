// Packed-tarball smoke test for packages/kit.
//
// `publint` + a workspace typecheck check dist/ *shape* and source *types* — neither one actually
// installs the published package the way a real consumer would. Two real bugs (a missing
// `shims: true`, and a pre-existing `tooling/codemod` bin-symlink defect — see DECISIONS.md's
// "Review pass — packaging fixes" entry) were invisible to both and only surfaced by doing exactly
// what this script automates: build → pack → install the tarball into an isolated fixture, outside
// this repo's own pnpm workspace (so nothing resolves via workspace hoisting) → exercise every
// public entry the way a consumer's code actually would.
//
// Run: pnpm --filter praxis-kit test:pack (from anywhere), or `tsx scripts/smoke-test.ts` from
// this directory. Exits non-zero on any failure — safe to wire into CI once CI itself is ported
// (see .vscode/MIGRATION.md).

import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

// Every plain-JS-importable public subpath. `ts-plugin` is excluded (CJS `require`-loaded by
// tsserver, not a normal ESM import); `codemod` is exercised through its real `.bin` entry below
// instead of a plain `import` (that's the realistic consumer path for a CLI).
const ENTRIES = [
  'react',
  'react/legacy',
  'preact',
  'vue',
  'lit',
  'web',
  'svelte',
  'tailwind',
  'eslint',
  'vite-plugin',
  'contract',
  'guards',
  'html',
  'utils',
]

const PEERS = [
  'react',
  'react-dom',
  'vue',
  'preact',
  'lit',
  'svelte',
  'eslint',
  'typescript',
  'vite',
]

// One real exported name per typed public entry — enough to force `tsc` to actually resolve and
// read that entry's `.d.ts` from the installed tarball, not just confirm the file exists. Catches
// what a runtime `import()` check can't: a wrong `types` path, a broken declaration import, a
// `typesVersions` mistake, or a stray unresolved `@praxis-kit/*` reference leaking into public
// types. `svelte` is excluded — it ships JS-only, a known/documented gap, not an oversight here.
// `codemod` is excluded — its `.d.ts` is `export {}` (a CLI with no importable API surface), so
// there's nothing to resolve. `ts-plugin` is excluded — its CJS `export = init` shape needs
// different import syntax than every other (ESM, named-export) entry, and it's excluded from the
// runtime import check above for the same underlying reason.
//
// Confirmed with a negative control: renaming one of these to a nonexistent export makes this step
// fail with a real `tsc` TS2305 "has no exported member" error, not a silent pass.
const TYPE_CHECK_ENTRIES: Record<string, string> = {
  react: 'AnyFactoryOptions',
  'react/legacy': 'AnyFactoryOptions',
  preact: 'AnyFactoryOptions',
  vue: 'AnyFactoryOptions',
  lit: 'AnyFactoryOptions',
  web: 'AnyFactoryOptions',
  tailwind: 'ClassBuilder',
  eslint: 'plugin',
  'vite-plugin': 'ComponentConstraint',
  contract: 'AnyFactoryOptions',
  guards: 'COMPONENT_DEFAULT_TAG',
  html: 'ANCHOR_RULES',
  utils: 'memoize',
}

function run(cmd: string, args: string[], cwd: string): string {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} failed (exit ${result.status}) in ${cwd}\n${result.stdout}\n${result.stderr}`,
    )
  }
  // `praxis-codemod`'s own usage/status output goes to stderr by design (see
  // tooling/codemod/src/cli/usage.ts) — echo it here for debugging, but keep the *returned* value
  // stdout-only so a caller relying on it for structured output (`pnpm pack --json`) isn't at risk
  // of stray stderr noise corrupting it.
  if (result.stderr) console.error(result.stderr)
  return result.stdout
}

function main(): void {
  console.log('smoke-test: building fresh dist/ …')
  run('pnpm', ['build'], KIT_DIR)

  console.log('smoke-test: packing …')
  const packOutput = run('pnpm', ['pack', '--json'], KIT_DIR)
  const tarballName = (JSON.parse(packOutput) as { filename: string }).filename
  const tarballPath = join(KIT_DIR, tarballName)
  if (!existsSync(tarballPath)) throw new Error(`pnpm pack did not produce ${tarballPath}`)

  // Outside this repo's pnpm workspace entirely — inside it, `npm`/`pnpm` would resolve
  // `@praxis-kit/*`-adjacent things via workspace hoisting and mask exactly the class of bug this
  // script exists to catch.
  const fixture = mkdtempSync(join(tmpdir(), 'praxis-kit-smoke-'))
  console.log(`smoke-test: fixture at ${fixture}`)

  try {
    run('npm', ['init', '-y'], fixture)
    console.log(
      'smoke-test: installing tarball + peers (isolated fixture, no workspace hoisting) …',
    )
    run('npm', ['install', tarballPath, ...PEERS, '--no-audit', '--no-fund'], fixture)

    const checkFile = join(fixture, 'check.mjs')
    const importLines = ENTRIES.map(
      (entry) => `
try {
  const mod = await import('praxis-kit/${entry}')
  results.push({ entry: '${entry}', ok: true, exportCount: Object.keys(mod).length })
} catch (err) {
  results.push({ entry: '${entry}', ok: false, error: String(err?.message ?? err) })
}`,
    ).join('\n')
    writeFileSync(
      checkFile,
      `const results = []\n${importLines}\nfor (const r of results) {
  console.log(r.ok ? \`OK   \${r.entry} (\${r.exportCount} exports)\` : \`FAIL \${r.entry}: \${r.error}\`)
}
const failed = results.filter((r) => !r.ok)
if (failed.length > 0) {
  console.error(\`\${failed.length} of \${results.length} entries failed to import\`)
  process.exit(1)
}
console.log(\`All \${results.length} entries imported cleanly\`)
`,
    )

    console.log('smoke-test: importing every public JS entry …')
    console.log(run('node', ['check.mjs'], fixture))

    // `publint` and a workspace typecheck both stop short of this: neither installs the tarball
    // and resolves `praxis-kit/<entry>`'s `types` field the way a real consumer's `tsc` would. A
    // plain re-export (rather than a bare `import type`) guarantees each name is actually used, so
    // nothing here can pass by accident via an unused-import elision.
    const typeCheckFile = join(fixture, 'check-types.ts')
    writeFileSync(
      typeCheckFile,
      Object.entries(TYPE_CHECK_ENTRIES)
        .map(
          ([entry, name], i) => `export type { ${name} as _check${i} } from 'praxis-kit/${entry}'`,
        )
        .join('\n') + '\n',
    )
    console.log('smoke-test: resolving types for every typed public entry (tsc --noEmit) …')
    const tscBin = join(fixture, 'node_modules', '.bin', 'tsc')
    console.log(
      run(
        'node',
        [
          tscBin,
          '--noEmit',
          '--strict',
          '--skipLibCheck',
          '--module',
          'esnext',
          '--moduleResolution',
          'bundler',
          '--target',
          'es2022',
          '--lib',
          'es2022,dom',
          typeCheckFile,
        ],
        fixture,
      ),
    )

    console.log('smoke-test: running praxis-codemod through its real .bin symlink …')
    const binPath = join(fixture, 'node_modules', '.bin', 'praxis-codemod')
    console.log(run('node', [binPath, '--help'], fixture))

    mkdirSync(join(fixture, 'src'), { recursive: true })
    writeFileSync(
      join(fixture, 'src', 'sample.ts'),
      `import { createPolymorphicComponent } from '@praxis-kit/react'\nconst Button = createPolymorphicComponent({})\n`,
    )
    const migrateOutput = run(
      'node',
      [binPath, 'migrate', '--dry-run', '--files', 'src/**/*.ts'],
      fixture,
    )
    console.log(migrateOutput)
    if (!/rename/.test(migrateOutput)) {
      throw new Error(
        `expected praxis-codemod migrate --dry-run to report a rename, got: ${migrateOutput}`,
      )
    }

    console.log('smoke-test: PASS')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
    rmSync(tarballPath, { force: true })
  }
}

main()
