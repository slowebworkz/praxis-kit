// Collects a metrics snapshot from three sources:
//   1. Bundle sizes  — qa/tree-shaking-tests/snapshots/gzip.json
//   2. Architecture  — .repo-state/{dependency-graph,exports}.json (from the root `pnpm repo-state`)
//   3. Complexity    — a ts-morph scan over the framework-neutral enforcement "spine"
//                       (lib/primitive through packages/core) — deliberately not every lib/*
//                       dir; see SOURCE_PACKAGES below, and framework adapters are out of scope
//                       entirely, matching ../pk's original framing.
//
// Run: pnpm --filter @praxis-kit/metrics collect (after `pnpm repo-state` has run at least once)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Node, Project, SyntaxKind } from 'ts-morph'
import type { SourceFile } from 'ts-morph'
import { iterate } from '@praxis-kit/foundation'
import type { StringMap } from '@praxis-kit/foundation'
import type { DepGraph, ExportsFile, GzipSnapshot, PackageMetrics, Snapshot } from './types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..')
const REPO_STATE = join(ROOT, '.repo-state')

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

// ── bundles ───────────────────────────────────────────────────────────────────

function collectBundles(): StringMap<number> {
  const gzip = readJson<GzipSnapshot>(join(ROOT, 'qa/tree-shaking-tests/snapshots/gzip.json'))
  const bundles: StringMap<number> = {}
  if (!gzip) return bundles

  const scenarios = Object.keys(gzip).sort()
  iterate.forEach(scenarios, (scenario) => {
    bundles[scenario] = gzip[scenario]?.gzip ?? 0
  })
  return bundles
}

// ── architecture ──────────────────────────────────────────────────────────────

function collectExports(file: ExportsFile): StringMap<{ values: number; types: number }> {
  const out: StringMap<{ values: number; types: number }> = {}
  const keys = Object.keys(file)
    .filter((k) => k !== 'generated' && k.startsWith('@'))
    .sort()

  iterate.forEach(keys, (name) => {
    const entry = file[name] as { values?: string[]; types?: string[] }
    out[name] = { values: (entry.values ?? []).length, types: (entry.types ?? []).length }
  })
  return out
}

function collectArchitecture(): Snapshot['architecture'] {
  const depGraph = readJson<DepGraph>(join(REPO_STATE, 'dependency-graph.json'))
  const exportsFile = readJson<ExportsFile>(join(REPO_STATE, 'exports.json'))

  return {
    status: depGraph?.status ?? 'UNKNOWN',
    violations: depGraph?.violations.length ?? 0,
    exports: exportsFile ? collectExports(exportsFile) : {},
  }
}

// ── complexity ────────────────────────────────────────────────────────────────
//
// Of the 11 real lib/* directories, excluded: lib/pipeline (no real production consumer yet)
// and lib/playwright (Playwright-CT test helpers, not shipped runtime code — the same tier as
// the qa/* packages this scan already excludes). Included, beyond a narrower cut: contract-props
// and diagnostics (both load-bearing, threaded through every adapter's enforcement path),
// tailwind (a real, substantial shipped styling-stack member), pipeline-kit (a real
// packages/core dependency), and runtime (a real adapter dependency). Framework adapters
// themselves stay out of scope — this tracks the framework-neutral spine, not per-adapter code.
const SOURCE_PACKAGES = [
  { key: 'lib/primitive', src: 'lib/primitive/src' },
  { key: 'lib/diagnostics', src: 'lib/diagnostics/src' },
  { key: 'lib/contract-props', src: 'lib/contract-props/src' },
  { key: 'lib/contract', src: 'lib/contract/src' },
  { key: 'lib/styling', src: 'lib/styling/src' },
  { key: 'lib/tailwind', src: 'lib/tailwind/src' },
  { key: 'lib/pipeline-kit', src: 'lib/pipeline-kit/src' },
  { key: 'lib/runtime', src: 'lib/runtime/src' },
  { key: 'lib/adapter-utils', src: 'lib/adapter-utils/src' },
  { key: 'packages/core', src: 'packages/core/src' },
] as const

// A top-level `const foo = () => {}` — its parent chain is
// VariableDeclaration -> VariableDeclarationList -> VariableStatement -> SourceFile.
function isModuleArrowFunction(node: Node): boolean {
  return (
    Node.isVariableDeclaration(node) &&
    node.getInitializerIfKind(SyntaxKind.ArrowFunction) !== undefined &&
    Node.isSourceFile(node.getParent()?.getParent()?.getParent())
  )
}

function countFunctions(sf: SourceFile): number {
  let count = 0
  sf.forEachDescendant((node) => {
    const kind = node.getKind()
    if (
      kind === SyntaxKind.FunctionDeclaration ||
      kind === SyntaxKind.MethodDeclaration ||
      kind === SyntaxKind.Constructor ||
      isModuleArrowFunction(node)
    ) {
      count++
    }
  })
  return count
}

// A manual line scan rather than `.split('\n')` — avoids allocating an array of every line just
// to filter most of them back out. Blank lines and `//`-only comment lines don't count as "real"
// lines; block comments and inline trailing comments are counted (a line with real code on it).
function countLoc(text: string): number {
  let loc = 0
  let index = 0

  while (index < text.length) {
    const newlineIndex = text.indexOf('\n', index)
    const lineEnd = newlineIndex === -1 ? text.length : newlineIndex

    let start = index
    while (start < lineEnd && (text[start] === ' ' || text[start] === '\t')) start++

    const isBlank = start === lineEnd
    const isCommentOnly = !isBlank && text[start] === '/' && text[start + 1] === '/'
    if (!isBlank && !isCommentOnly) loc++

    index = lineEnd + 1
  }

  return loc
}

function collectComplexity(): StringMap<PackageMetrics> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { skipLibCheck: true, noEmit: true },
  })

  const buckets: StringMap<PackageMetrics> = {}
  iterate.forEach(SOURCE_PACKAGES, ({ key }) => {
    buckets[key] = { files: 0, functions: 0, loc: 0 }
  })

  const dirs = SOURCE_PACKAGES.map(({ key, src }) => ({ key, dir: join(ROOT, src) })).filter(
    ({ dir }) => existsSync(dir),
  )

  project.addSourceFilesAtPaths(
    dirs.flatMap(({ dir }) => [
      join(dir, '**/*.ts'),
      `!${join(dir, '**/*.test.ts')}`,
      `!${join(dir, '**/*.bench.ts')}`,
      `!${join(dir, '**/*.spec.ts')}`,
      `!${join(dir, '**/*.d.ts')}`,
    ]),
  )

  for (const sf of project.getSourceFiles()) {
    const filePath = sf.getFilePath()
    const owner = dirs.find(({ dir }) => filePath.startsWith(dir + '/'))
    if (!owner) continue

    const bucket = buckets[owner.key]
    if (!bucket) continue

    bucket.files++
    bucket.loc += countLoc(sf.getFullText())
    bucket.functions += countFunctions(sf)
  }

  return buckets
}

// ── main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const snapshot: Snapshot = {
    generated: new Date().toISOString(),
    bundles: collectBundles(),
    architecture: collectArchitecture(),
    complexity: collectComplexity(),
  }

  const outDir = join(__dirname, '..', 'snapshots')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'metrics.json'), JSON.stringify(snapshot, null, 2) + '\n')

  console.log('✓  snapshots/metrics.json written')
}

main()
