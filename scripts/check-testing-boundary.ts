// check-testing-boundary.ts
//
// Enforces the testing workspace's one-way dependency rule: production packages must never
// depend on `testing/packages/*` (testing packages may depend on production packages).
//
// Run: pnpm check:testing-boundary
//
// Two independent checks, because a manifest-only check misses imports that bypass package.json
// (a path alias or a relative `../../testing/...` import) and a source-only check misses a
// dependency that is declared but not yet imported:
//   1. Manifest — a package outside `testing/packages/*` may list a testing package only under
//      `devDependencies`. `dependencies` / `peerDependencies` / `optionalDependencies` are
//      violations. `packages/kit` (the published package) may not reference one at all.
//   2. Source — non-test source files of production packages must not import a testing package
//      (by name or by relative path into `testing/packages/`). Test files, test-host fixtures,
//      test/E2E configs and the conformance-adapter helpers are exempt: they exist to run tests.
//
// Like generate-repo-state.ts, this reads pnpm-workspace.yaml with a narrow line-based reader
// (quoted `<dir>/*` globs only) rather than pulling in a YAML dependency for a short list.

import type { AnyRecord } from '@praxis-kit/primitive'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TESTING_PREFIX = 'testing/packages/'
const PUBLISHED_PACKAGE_DIR = 'packages/kit'
const PRODUCTION_DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'] as const
const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|svelte|vue)$/
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.turbo', '.repo-state'])

// Files that exist to run tests, even when they are not named `*.test.*`.
const TEST_SUPPORT_FILE = [
  /\.(?:test|spec)\.[cm]?[jt]sx?$/,
  /\.test-host\.(?:svelte|vue)$/,
  /(?:^|\/)(?:playwright-ct|vitest(?:\.[a-z]+)?)\.config\.[cm]?[jt]s$/,
  /(?:^|\/)make-conformance-adapter\.[cm]?[jt]sx?$/,
]

interface WorkspacePackage {
  name: string
  dir: string // repo-relative, forward slashes
  pkg: AnyRecord
}

function readJson(path: string): AnyRecord {
  return JSON.parse(readFileSync(path, 'utf-8')) as AnyRecord
}

function discoverWorkspaceGlobs(): string[] {
  const globs: string[] = []
  let inPackages = false
  for (const line of readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf-8').split('\n')) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true
      continue
    }
    if (!inPackages) continue
    const match = /^\s*-\s*"([^"]+)"\s*$/.exec(line)
    if (!match?.[1]) break
    globs.push(match[1])
  }
  return globs
}

function discoverPackages(): WorkspacePackage[] {
  const found: WorkspacePackage[] = []
  for (const glob of discoverWorkspaceGlobs()) {
    const topDir = join(ROOT, glob.replace(/\/\*$/, ''))
    if (!existsSync(topDir)) continue
    for (const entry of readdirSync(topDir, { withFileTypes: true })) {
      const pkgJson = join(topDir, entry.name, 'package.json')
      if (!entry.isDirectory() || !existsSync(pkgJson)) continue
      const pkg = readJson(pkgJson)
      const dir = relative(ROOT, join(topDir, entry.name)).split('\\').join('/')
      found.push({ name: pkg['name'] as string, dir, pkg })
    }
  }
  return found
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (SOURCE_EXTENSIONS.test(entry.name)) yield full
  }
}

// `from '…'`, side-effect `import '…'`, dynamic `import('…')` and `require('…')`.
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g

function main(): void {
  const packages = discoverPackages()
  const testing = packages.filter((p) => p.dir.startsWith(TESTING_PREFIX))
  const testingNames = new Set(testing.map((p) => p.name))
  const production = packages.filter((p) => !p.dir.startsWith(TESTING_PREFIX))
  const violations: string[] = []

  for (const pkg of production) {
    const fields =
      pkg.dir === PUBLISHED_PACKAGE_DIR
        ? [...PRODUCTION_DEP_FIELDS, 'devDependencies']
        : PRODUCTION_DEP_FIELDS
    for (const field of fields) {
      for (const dep of Object.keys((pkg.pkg[field] as AnyRecord | undefined) ?? {})) {
        if (!testingNames.has(dep)) continue
        violations.push(
          `${pkg.dir}/package.json: ${field} lists testing package ${dep}` +
            (field === 'devDependencies' ? ' (the published package may not reference one)' : ''),
        )
      }
    }

    const srcRoot = join(ROOT, pkg.dir)
    for (const file of walk(srcRoot)) {
      const rel = relative(ROOT, file).split('\\').join('/')
      if (TEST_SUPPORT_FILE.some((pattern) => pattern.test(rel))) continue
      const text = readFileSync(file, 'utf-8')
      for (const match of text.matchAll(SPECIFIER)) {
        const specifier = match[2] as string
        const byName = [...testingNames].some(
          (n) => specifier === n || specifier.startsWith(n + '/'),
        )
        const byPath = specifier.startsWith('.') && specifier.includes('/' + TESTING_PREFIX)
        if (byName || byPath) violations.push(`${rel}: production source imports "${specifier}"`)
      }
    }
  }

  if (violations.length > 0) {
    console.error('Testing boundary violations (production must not depend on testing):\n')
    for (const v of violations) console.error(`  ✗ ${v}`)
    process.exit(1)
  }
  console.log(
    `Testing boundary OK — ${testing.length} testing package(s), ${production.length} production package(s) checked.`,
  )
}

main()
