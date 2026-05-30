/**
 * Collects metrics from all data sources and writes snapshots/metrics.json.
 *
 * Sources:
 *   Bundles     — packages/tree-shaking-tests/snapshots/gzip.json
 *   Architecture — .repo-state/dependency-graph.json + exports.json
 *   Complexity   — ts-morph walk of lib/ and packages/core source files
 *
 * Run: pnpm --filter @praxis-ui/metrics collect
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Node, Project, SyntaxKind } from 'ts-morph'
import type { DepGraph, ExportsFile, GzipSnapshot, PackageMetrics, Snapshot } from './types.ts'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

// ── Bundles ───────────────────────────────────────────────────────────────────

const gzipRaw = JSON.parse(
  await readFile(join(root, 'packages/tree-shaking-tests/snapshots/gzip.json'), 'utf8'),
) as GzipSnapshot

const bundles: Record<string, number> = {}
for (const scenario of Object.keys(gzipRaw).sort((a, b) => gzipRaw[b]!.gzip - gzipRaw[a]!.gzip)) {
  bundles[scenario] = gzipRaw[scenario]!.gzip
}

// ── Architecture ──────────────────────────────────────────────────────────────

const depGraph = JSON.parse(
  await readFile(join(root, '.repo-state/dependency-graph.json'), 'utf8'),
) as DepGraph

const exportsFile = JSON.parse(
  await readFile(join(root, '.repo-state/exports.json'), 'utf8'),
) as ExportsFile

const architecture = {
  status: depGraph.status,
  violations: depGraph.violations.length,
  exports: (() => {
    const out: Record<string, { values: number; types: number }> = {}
    const keys = Object.keys(exportsFile)
      .filter((k) => k !== 'generated' && k.startsWith('@'))
      .sort()
    for (const name of keys) {
      const d = exportsFile[name] as { values?: string[]; types?: string[] }
      out[name] = { values: (d.values ?? []).length, types: (d.types ?? []).length }
    }
    return out
  })(),
}

// ── Complexity ────────────────────────────────────────────────────────────────

const SOURCE_PACKAGES = [
  { key: 'lib/primitive', src: 'lib/primitive/src' },
  { key: 'lib/contract', src: 'lib/contract/src' },
  { key: 'lib/styling', src: 'lib/styling/src' },
  { key: 'lib/adapter-utils', src: 'lib/adapter-utils/src' },
  { key: 'packages/core', src: 'packages/core/src' },
]

// One Project for all packages — parse and build AST once, not once per package.
const project = new Project({ skipAddingFilesFromTsConfig: true })
project.addSourceFilesAtPaths([
  ...SOURCE_PACKAGES.map(({ src }) => join(root, src, '**/*.ts')),
  `!${join(root, '**/*.test.ts')}`,
  `!${join(root, '**/*.bench.ts')}`,
  `!${join(root, '**/*.d.ts')}`,
])

// Pre-compute absolute prefix for each package so each source file can be
// routed to its bucket with a single startsWith check.
const prefixes = SOURCE_PACKAGES.map(({ key, src }) => ({
  prefix: join(root, src),
  key,
}))

const complexity: Record<string, PackageMetrics> = {}
for (const { key } of SOURCE_PACKAGES) {
  complexity[key] = { files: 0, functions: 0, loc: 0 }
}

for (const sf of project.getSourceFiles()) {
  const filePath = sf.getFilePath()

  let metrics: PackageMetrics | undefined
  for (const { prefix, key } of prefixes) {
    if (filePath.startsWith(prefix)) {
      metrics = complexity[key]
      break
    }
  }
  if (!metrics) continue

  metrics.files++

  // LOC: single character scan — no split(), no per-line string allocation.
  const text = sf.getText()
  let i = 0
  const n = text.length
  while (i < n) {
    // Skip leading whitespace to detect blank/comment lines
    let j = i
    while (j < n && (text[j] === ' ' || text[j] === '\t')) j++
    const blank = j >= n || text[j] === '\n'
    const comment = !blank && text[j] === '/' && j + 1 < n && text[j + 1] === '/'
    // Advance to end of line
    while (i < n && text[i] !== '\n') i++
    i++ // skip \n
    if (!blank && !comment) metrics.loc++
  }

  // Function count: single AST traversal instead of four separate
  // getDescendantsOfKind calls (each of which walks the full AST).
  sf.forEachDescendant((node) => {
    switch (node.getKind()) {
      case SyntaxKind.FunctionDeclaration:
      case SyntaxKind.MethodDeclaration:
      case SyntaxKind.Constructor:
        metrics.functions++
        break
      case SyntaxKind.VariableDeclaration:
        // Module-level named arrow functions only — not inline callbacks
        if (Node.isVariableDeclaration(node) && node.getInitializerIfKind(SyntaxKind.ArrowFunction))
          metrics.functions++
        break
    }
  })
}

// ── Write snapshot ────────────────────────────────────────────────────────────

const snapshot = {
  generated: new Date().toISOString(),
  bundles,
  architecture,
  complexity,
} satisfies Snapshot

const outPath = join(pkg, '../snapshots/metrics.json')
await writeFile(outPath, JSON.stringify(snapshot, null, 2) + '\n')
console.log('metrics collected → snapshots/metrics.json')
