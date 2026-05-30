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
import { Project, SyntaxKind } from 'ts-morph'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

// ── Bundles ───────────────────────────────────────────────────────────────────

type GzipSnapshot = Record<string, { gzip: number }>

const gzipRaw = JSON.parse(
  await readFile(join(root, 'packages/tree-shaking-tests/snapshots/gzip.json'), 'utf8'),
) as GzipSnapshot

const bundles: Record<string, number> = {}
for (const scenario of Object.keys(gzipRaw).sort((a, b) => gzipRaw[b]!.gzip - gzipRaw[a]!.gzip)) {
  bundles[scenario] = gzipRaw[scenario]!.gzip
}

// ── Architecture ──────────────────────────────────────────────────────────────

type DepGraph = {
  status: string
  violations: unknown[]
  packageImports: Record<string, string[]>
}

type ExportsFile = {
  generated: string
  [pkg: string]: { values?: string[]; types?: string[] } | string
}

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

const SOURCE_PACKAGES: { key: string; glob: string }[] = [
  { key: 'lib/primitive', glob: 'lib/primitive/src/**/*.ts' },
  { key: 'lib/contract', glob: 'lib/contract/src/**/*.ts' },
  { key: 'lib/styling', glob: 'lib/styling/src/**/*.ts' },
  { key: 'lib/adapter-utils', glob: 'lib/adapter-utils/src/**/*.ts' },
  { key: 'packages/core', glob: 'packages/core/src/**/*.ts' },
]

const EXCLUDE_GLOBS = ['**/*.test.ts', '**/*.bench.ts', '**/*.d.ts']

function measurePackage(glob: string): { files: number; functions: number; loc: number } {
  const project = new Project({ skipAddingFilesFromTsConfig: true })
  project.addSourceFilesAtPaths([
    join(root, glob),
    ...EXCLUDE_GLOBS.map((ex) => `!${join(root, ex)}`),
  ])

  let files = 0
  let functions = 0
  let loc = 0

  for (const sf of project.getSourceFiles()) {
    files++

    // LOC: non-blank, non-single-line-comment lines
    for (const line of sf.getText().split('\n')) {
      const t = line.trim()
      if (t.length > 0 && !t.startsWith('//')) loc++
    }

    // Named functions: declarations, class methods, constructors
    functions += sf.getDescendantsOfKind(SyntaxKind.FunctionDeclaration).length
    functions += sf.getDescendantsOfKind(SyntaxKind.MethodDeclaration).length
    functions += sf.getDescendantsOfKind(SyntaxKind.Constructor).length
    // Module-level named arrow functions (variable initializers — not inline callbacks)
    for (const v of sf.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
      if (v.getInitializerIfKind(SyntaxKind.ArrowFunction)) functions++
    }
  }

  return { files, functions, loc }
}

const complexity: Record<string, { files: number; functions: number; loc: number }> = {}
for (const { key, glob } of SOURCE_PACKAGES) {
  complexity[key] = measurePackage(glob)
}

// ── Write snapshot ────────────────────────────────────────────────────────────

const snapshot = {
  generated: new Date().toISOString(),
  bundles,
  architecture,
  complexity,
}

const outPath = join(pkg, '../snapshots/metrics.json')
await writeFile(outPath, JSON.stringify(snapshot, null, 2) + '\n')
console.log('metrics collected → snapshots/metrics.json')
