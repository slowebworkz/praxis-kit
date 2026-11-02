// check-testing-boundary.ts
//
// Enforces the testing workspace's one-way dependency rule: production packages must never
// depend on `testing/packages/*` (testing packages may depend on production packages).
//
// Run: pnpm check:testing-boundary      Tests: pnpm test:scripts
//
// Two independent checks, because a manifest-only check misses imports that bypass package.json
// (a path alias or a relative `../../testing/...` import) and a source-only check misses a
// dependency that is declared but not yet imported:
//   1. Manifest — a package outside `testing/packages/*` may list a testing package only under
//      `devDependencies`. `dependencies` / `peerDependencies` / `optionalDependencies` are
//      violations. `packages/kit` (the published package) may not reference one at all.
//   2. Source — non-test source files of production packages must not import a testing package
//      (by name, or by a relative path that resolves into `testing/packages/`). Test files, test
//      hosts, test/E2E configs and the conformance-adapter helpers are exempt: they exist to run
//      tests.
//
// Imports are found by parsing each file with the TypeScript compiler (a real AST walk), so
// comments and string literals are never mistaken for imports, and every executable form is seen:
// `import`/`import type`, `export … from`, `import x = require()`, dynamic `import()`, `require()`
// and `import('…')` types. Svelte/Vue files are scanned through their `<script>` blocks.
//
// The rule logic (`findViolations`, `importSpecifiers`) is pure and exported so it can be tested
// without a filesystem; `main()` is the only part that reads the repo.
//
// Like generate-repo-state.ts, this reads pnpm-workspace.yaml with a narrow line-based reader
// (quoted `<dir>/*` globs only) rather than pulling in a YAML dependency for a short list.

import type { AnyRecord } from '@praxis-kit/primitive'
import ts from 'typescript'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, posix, relative, resolve } from 'node:path'
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

export interface WorkspacePackage {
  name: string
  dir: string // repo-relative, forward slashes
  pkg: AnyRecord
}

/** A source file to scan: repo-relative path (forward slashes) and its contents. */
export interface SourceFile {
  path: string
  text: string
}

export function isTestSupportFile(path: string): boolean {
  return TEST_SUPPORT_FILE.some((pattern) => pattern.test(path))
}

function scriptKindOf(path: string): ts.ScriptKind {
  if (/\.tsx$/.test(path)) return ts.ScriptKind.TSX
  if (/\.jsx$/.test(path)) return ts.ScriptKind.JSX
  if (/\.[cm]?js$/.test(path)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

// The source text to parse for a file: the file itself, or each `<script>` block of an SFC.
function parseableSources(path: string, text: string): { text: string; kind: ts.ScriptKind }[] {
  if (/\.(?:svelte|vue)$/.test(path)) {
    return [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => ({
      text: m[1] as string,
      kind: ts.ScriptKind.TS,
    }))
  }
  return [{ text, kind: scriptKindOf(path) }]
}

const isStringLike = (node: ts.Node | undefined): node is ts.StringLiteralLike =>
  node !== undefined && ts.isStringLiteralLike(node)

/** Every module specifier the file's executable source imports, in source order. */
export function importSpecifiers(path: string, text: string): string[] {
  const found: string[] = []
  for (const source of parseableSources(path, text)) {
    const file = ts.createSourceFile(path, source.text, ts.ScriptTarget.Latest, true, source.kind)
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (isStringLike(node.moduleSpecifier)) found.push(node.moduleSpecifier.text)
      } else if (ts.isImportEqualsDeclaration(node)) {
        const ref = node.moduleReference
        if (ts.isExternalModuleReference(ref) && isStringLike(ref.expression)) {
          found.push(ref.expression.text)
        }
      } else if (ts.isCallExpression(node)) {
        const callee = node.expression
        const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword
        const isRequire = ts.isIdentifier(callee) && callee.text === 'require'
        if ((isDynamicImport || isRequire) && isStringLike(node.arguments[0])) {
          found.push(node.arguments[0].text)
        }
      } else if (ts.isImportTypeNode(node)) {
        const arg = node.argument
        if (ts.isLiteralTypeNode(arg) && isStringLike(arg.literal)) found.push(arg.literal.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return found
}

// Does `specifier`, written in `fromPath`, name a testing package -- by package name, or by a
// relative path that resolves into `testing/packages/`?
function reachesTesting(fromPath: string, specifier: string, testingNames: Set<string>): boolean {
  if (specifier.startsWith('.')) {
    const resolved = posix.normalize(posix.join(posix.dirname(fromPath), specifier))
    return resolved.startsWith(TESTING_PREFIX)
  }
  return [...testingNames].some((n) => specifier === n || specifier.startsWith(n + '/'))
}

/**
 * The testing-boundary violations for the given workspace. Pure: pass the discovered packages and
 * the source files of every package (testing packages' files are ignored here), get messages back.
 */
export function findViolations(packages: WorkspacePackage[], files: SourceFile[]): string[] {
  const testingNames = new Set(
    packages.filter((p) => p.dir.startsWith(TESTING_PREFIX)).map((p) => p.name),
  )
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
  }

  const productionDirs = production.map((p) => p.dir + '/')
  for (const file of files) {
    if (!productionDirs.some((dir) => file.path.startsWith(dir))) continue
    if (isTestSupportFile(file.path)) continue
    for (const specifier of importSpecifiers(file.path, file.text)) {
      if (reachesTesting(file.path, specifier, testingNames)) {
        violations.push(`${file.path}: production source imports "${specifier}"`)
      }
    }
  }

  return violations
}

// ── repository access (the only part that touches the filesystem) ────────────────────────────

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

function main(): void {
  const packages = discoverPackages()
  const testingCount = packages.filter((p) => p.dir.startsWith(TESTING_PREFIX)).length
  const files: SourceFile[] = []
  for (const pkg of packages.filter((p) => !p.dir.startsWith(TESTING_PREFIX))) {
    for (const file of walk(join(ROOT, pkg.dir))) {
      files.push({
        path: relative(ROOT, file).split('\\').join('/'),
        text: readFileSync(file, 'utf-8'),
      })
    }
  }

  const violations = findViolations(packages, files)
  if (violations.length > 0) {
    console.error('Testing boundary violations (production must not depend on testing):\n')
    for (const v of violations) console.error(`  ✗ ${v}`)
    process.exit(1)
  }
  console.log(
    `Testing boundary OK — ${testingCount} testing package(s), ${packages.length - testingCount} production package(s) checked.`,
  )
}

// Run only when executed directly, so the tests can import the pure functions above.
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
