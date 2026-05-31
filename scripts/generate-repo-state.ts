/**
 * generate-repo-state.ts
 *
 * Generates architecture manifests for the praxis-ui monorepo into .repo-state/.
 * Run: node --experimental-strip-types scripts/generate-repo-state.ts
 *
 * Outputs:
 *   .repo-state/packages.json          — package graph and inter-package dependencies
 *   .repo-state/exports.json           — public export surfaces per package (ts-morph)
 *   .repo-state/contracts.json         — key contract types with their fields (ts-morph)
 *   .repo-state/dependency-graph.json  — module import graph + violations (dependency-cruiser)
 *   .repo-state/runtime-graph.json     — documented execution phase order
 *   .repo-state/adapters.json          — adapter inventory
 *   .repo-state/architecture-hash.json — deterministic hash for architectural diff detection
 */

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project, SyntaxKind } from 'ts-morph'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, '.repo-state')
const DC_BIN = join(ROOT, 'node_modules', '.bin', 'depcruise')

// ── utilities ─────────────────────────────────────────────────────────────────

function write(name: string, data: unknown): void {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n')
}

function sha256(s: string): string {
  return 'sha256:' + createHash('sha256').update(s).digest('hex').slice(0, 16)
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
}

// ── package discovery ─────────────────────────────────────────────────────────

interface PackageMeta {
  name: string
  version: string
  dir: string
  pkg: Record<string, unknown>
}

function discoverPackages(): PackageMeta[] {
  return readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(ROOT, 'packages', d.name)
      const pkg = readJson(join(dir, 'package.json'))
      return { name: pkg.name as string, version: pkg.version as string, dir, pkg }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function buildPackageGraph(packages: PackageMeta[]) {
  const internalNames = new Set(packages.map((p) => p.name))

  const pkgMap: Record<
    string,
    {
      path: string
      version: string
      internalDeps: string[]
      externalDeps: string[]
      peerDeps: string[]
    }
  > = {}

  for (const { name, version, dir, pkg } of packages) {
    const allDeps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    }
    const peerDeps = Object.keys((pkg.peerDependencies as Record<string, string>) ?? {})
    const internalDeps = Object.keys(allDeps).filter((d) => internalNames.has(d))
    const externalDeps = Object.keys(allDeps).filter(
      (d) => !internalNames.has(d) && !d.startsWith('@types/'),
    )
    pkgMap[name] = {
      path: 'packages/' + relative(join(ROOT, 'packages'), dir),
      version,
      internalDeps,
      externalDeps,
      peerDeps,
    }
  }

  const dependencyGraph: Record<string, string[]> = {}
  for (const [name, info] of Object.entries(pkgMap)) {
    dependencyGraph[name] = info.internalDeps
  }

  const cycles = detectCycles(dependencyGraph)
  return { packages: pkgMap, dependencyGraph, cycles }
}

function detectCycles(graph: Record<string, string[]>): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const stack: string[] = []

  function dfs(node: string): void {
    const idx = stack.indexOf(node)
    if (idx !== -1) {
      cycles.push(stack.slice(idx))
      return
    }
    if (visited.has(node)) return
    visited.add(node)
    stack.push(node)
    for (const dep of graph[node] ?? []) dfs(dep)
    stack.pop()
  }

  for (const node of Object.keys(graph)) dfs(node)
  return cycles
}

// ── export surfaces (ts-morph) ────────────────────────────────────────────────

function analyzeExports(packages: PackageMeta[]) {
  const result: Record<string, { entryPoint: string; values: string[]; types: string[] }> = {}

  for (const { name, dir } of packages) {
    const indexPath = join(dir, 'src', 'index.ts')
    if (!existsSync(indexPath)) continue

    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: { skipLibCheck: true, noEmit: true },
    })
    project.addSourceFilesAtPaths([join(dir, 'src/**/*.ts'), join(dir, 'src/**/*.tsx')])

    const indexFile = project.getSourceFile(indexPath)
    if (!indexFile) continue

    const values: string[] = []
    const types: string[] = []

    for (const [exportName, declarations] of indexFile.getExportedDeclarations()) {
      const decl = declarations[0]
      if (!decl) continue
      const kind = decl.getKind()
      const isTypeOnly =
        kind === SyntaxKind.TypeAliasDeclaration || kind === SyntaxKind.InterfaceDeclaration
      if (isTypeOnly) {
        types.push(exportName)
      } else {
        values.push(exportName)
      }
    }

    result[name] = {
      entryPoint: relative(ROOT, indexPath),
      values: [...new Set(values)].sort(),
      types: [...new Set(types)].sort(),
    }
  }

  return result
}

// ── key contracts (ts-morph) ──────────────────────────────────────────────────

const CONTRACT_NAMES = new Set([
  'AriaFix',
  'AriaRule',
  'ChildRuleInput',
  'ClassPlugin',
  'ClassPluginFactory',
  'FactoryOptions',
  'PolymorphicGenerics',
  'PolymorphicRuntime',
  'ResolvedFactoryOptions',
  'StrictMode',
])

function extractContracts(packages: PackageMeta[]) {
  const contracts: Array<{
    name: string
    kind: 'type' | 'interface'
    package: string
    file: string
    fields?: string[]
    genericParams?: string[]
  }> = []

  for (const { name: pkgName, dir } of packages) {
    const typesDir = join(dir, 'src', 'types')
    if (!existsSync(typesDir)) continue

    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: { skipLibCheck: true, noEmit: true },
    })

    for (const fileName of readdirSync(typesDir)) {
      if (!fileName.endsWith('.ts') || fileName.includes('.test.')) continue
      const filePath = join(typesDir, fileName)
      const sf = project.addSourceFileAtPath(filePath)

      for (const ta of sf.getTypeAliases()) {
        if (!CONTRACT_NAMES.has(ta.getName()) || !ta.isExported()) continue
        const fields =
          ta
            .getTypeNode()
            ?.getDescendantsOfKind(SyntaxKind.PropertySignature)
            .map((p) => p.getName()) ?? []
        const genericParams = ta.getTypeParameters().map((p) => p.getName())
        contracts.push({
          name: ta.getName(),
          kind: 'type',
          package: pkgName,
          file: relative(ROOT, filePath),
          ...(fields.length && { fields }),
          ...(genericParams.length && { genericParams }),
        })
      }

      for (const iface of sf.getInterfaces()) {
        if (!CONTRACT_NAMES.has(iface.getName()) || !iface.isExported()) continue
        const fields = iface.getProperties().map((p) => p.getName())
        const genericParams = iface.getTypeParameters().map((p) => p.getName())
        contracts.push({
          name: iface.getName(),
          kind: 'interface',
          package: pkgName,
          file: relative(ROOT, filePath),
          ...(fields.length && { fields }),
          ...(genericParams.length && { genericParams }),
        })
      }
    }
  }

  return { contracts: contracts.sort((a, b) => a.name.localeCompare(b.name)) }
}

// ── dependency graph (dependency-cruiser) ─────────────────────────────────────

interface DcViolation {
  rule: { name: string; severity: string }
  from: string
  to: string
}
interface DcModule {
  source: string
  dependencies: Array<{ resolved: string; dependencyTypes: string[] }>
}
interface DcOutput {
  modules: DcModule[]
  summary: { violations: DcViolation[]; error: number; warn: number; info: number }
}

function runDepCruise(): { output: DcOutput | null; error?: string } {
  if (!existsSync(DC_BIN)) {
    return { output: null, error: 'depcruise binary not found — run pnpm install' }
  }

  const result = spawnSync(
    DC_BIN,
    [
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
      '--include-only',
      '^packages',
      'packages',
    ],
    { cwd: ROOT, encoding: 'utf-8' },
  )

  // exit 0 = clean, 1 = violations found (output is still valid JSON), >1 = error
  if (result.status !== null && result.status > 1) {
    return { output: null, error: result.stderr || `exit code ${result.status}` }
  }

  try {
    return { output: JSON.parse(result.stdout) as DcOutput }
  } catch {
    return { output: null, error: 'failed to parse depcruise output' }
  }
}

function buildDependencyGraph() {
  const { output, error } = runDepCruise()

  if (!output) return { status: 'ERROR', error, violations: [], packageImports: {} }

  const { modules, summary } = output

  // Collapse to package-level import map
  const packageImports: Record<string, Set<string>> = {}
  for (const mod of modules) {
    const parts = mod.source.split('/')
    const pkgKey = parts.slice(0, 2).join('/') // e.g. packages/core
    if (!packageImports[pkgKey]) packageImports[pkgKey] = new Set()
    for (const dep of mod.dependencies) {
      if (!dep.resolved.startsWith('packages/')) continue
      const depKey = dep.resolved.split('/').slice(0, 2).join('/')
      if (depKey !== pkgKey) packageImports[pkgKey].add(depKey)
    }
  }

  return {
    status: summary.error > 0 ? 'VIOLATIONS' : summary.warn > 0 ? 'WARNINGS' : 'CLEAN',
    violations: summary.violations.filter((v) => v.rule.severity === 'error'),
    packageImports: Object.fromEntries(
      Object.entries(packageImports).map(([k, v]) => [k, [...v].sort()]),
    ),
  }
}

// ── runtime graph (documented) ────────────────────────────────────────────────

function buildRuntimeGraph() {
  return {
    factoryPhase: {
      description: 'Runs once at component definition time (factory call)',
      steps: [
        {
          name: 'resolveFactoryOptions',
          source: 'packages/core/src/options/resolve-factory-options.ts',
        },
        { name: 'createClassPipeline', source: 'packages/core/src/styles/class-pipeline.ts' },
        {
          name: 'instantiateAriaPolicyEngine',
          source: 'packages/core/src/validator/polymorphic-validator.ts',
        },
        {
          name: 'instantiateChildrenEvaluator',
          source: 'packages/core/src/children/children-evaluator.ts',
          condition: 'when childRules present',
        },
      ],
    },
    renderPhase: {
      description: 'Runs on every component render',
      steps: [
        { name: 'resolveTag', source: 'packages/core/src/resolver' },
        { name: 'resolveProps', source: 'packages/core/src/resolver' },
        { name: 'resolveClasses', source: 'packages/core/src/styles' },
        { name: 'resolveAria', source: 'packages/core/src/validator' },
        {
          name: 'evaluateChildren',
          source: 'packages/core/src/children',
          condition: 'when childRules present',
        },
      ],
    },
    classPipelineOrder: [
      'StaticClassResolver  — baseClassName + tagMap lookup (per-tag cache)',
      'VariantClassResolver — CVA call + presetMap lookup (LRU cache, 1 000 entries)',
      'classPlugin          — e.g. Tailwind layout filter (when styling.plugin present)',
      'cn()                 — merge with consumer className',
    ],
    ariaPipelineOrder: [
      'checkInvalidRoleOverride',
      'checkRedundantRole',
      'checkStandaloneRegion',
      'checkInvalidAriaAttributes',
      'customAriaRules      — appended when enforcement.aria is present',
    ],
  }
}

// ── adapters inventory ────────────────────────────────────────────────────────

function buildAdaptersMap(packages: PackageMeta[]) {
  const ADAPTER_SPECS = [
    {
      pkg: '@praxis-ui/react',
      framework: 'react',
      optionsType: 'ReactFactoryOptions',
      frameworkSpecificOptions: ['slotComponent', 'filterProps'],
    },
    {
      pkg: '@praxis-ui/vue',
      framework: 'vue',
      optionsType: 'VueFactoryOptions',
      frameworkSpecificOptions: ['filterProps'],
    },
  ]

  const adapters: Record<string, unknown> = {}

  for (const spec of ADAPTER_SPECS) {
    const meta = packages.find((p) => p.name === spec.pkg)
    if (!meta) continue

    const pkgExports = (meta.pkg.exports ?? {}) as Record<string, unknown>
    const entryPoints: Record<string, string> = {}
    for (const [key, val] of Object.entries(pkgExports)) {
      const ep = (val as Record<string, string> | null)?.import
      if (ep) entryPoints[key === '.' ? 'main' : key.replace('./', '')] = ep
    }

    adapters[spec.pkg] = {
      framework: spec.framework,
      optionsType: spec.optionsType,
      frameworkSpecificOptions: spec.frameworkSpecificOptions,
      entryPoints,
      hasLegacyPath: existsSync(join(meta.dir, 'src', 'legacy')),
      hasSSRTests:
        existsSync(join(meta.dir, 'src', 'ssr.test.ts')) ||
        existsSync(join(meta.dir, 'src', 'ssr.test.tsx')),
    }
  }

  return { adapters }
}

// ── main ──────────────────────────────────────────────────────────────────────

const generated = new Date().toISOString()
const packages = discoverPackages()

console.log(`Generating repo state for ${packages.length} packages…`)

const pkgGraph = buildPackageGraph(packages)
write('packages.json', { generated, ...pkgGraph })
console.log('  ✓ packages.json')

const exportsMap = analyzeExports(packages)
write('exports.json', { generated, ...exportsMap })
console.log('  ✓ exports.json')

const contracts = extractContracts(packages)
write('contracts.json', { generated, ...contracts })
console.log('  ✓ contracts.json')

const depGraph = buildDependencyGraph()
write('dependency-graph.json', { generated, ...depGraph })
console.log(`  ✓ dependency-graph.json  [${depGraph.status}]`)

const runtimeGraph = buildRuntimeGraph()
write('runtime-graph.json', { generated, ...runtimeGraph })
console.log('  ✓ runtime-graph.json')

const adaptersMap = buildAdaptersMap(packages)
write('adapters.json', { generated, ...adaptersMap })
console.log('  ✓ adapters.json')

const hashInput = JSON.stringify({ pkgGraph, exportsMap, contracts, depGraph })
write('architecture-hash.json', {
  generated,
  hash: sha256(hashInput),
  components: {
    packages: sha256(JSON.stringify(pkgGraph)),
    exports: sha256(JSON.stringify(exportsMap)),
    contracts: sha256(JSON.stringify(contracts)),
    dependencyGraph: sha256(JSON.stringify(depGraph)),
  },
})
console.log('  ✓ architecture-hash.json')

// ── summary ───────────────────────────────────────────────────────────────────

if (pkgGraph.cycles.length > 0) {
  console.error(`\n⚠  ${pkgGraph.cycles.length} dependency cycle(s) detected:`)
  for (const cycle of pkgGraph.cycles) console.error('   ' + cycle.join(' → '))
}

if (depGraph.status === 'VIOLATIONS') {
  console.error(`\n✗  ${depGraph.violations.length} architectural violation(s):`)
  for (const v of depGraph.violations) {
    console.error(`   [${v.rule.severity}] ${v.rule.name}:  ${v.from}  →  ${v.to}`)
  }
  process.exit(1)
}

console.log('\n✓  .repo-state/ written')
