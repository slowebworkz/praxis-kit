// generate-repo-state.ts
//
// Generates architecture manifests for the praxis-kit monorepo into .repo-state/. Ported from
// ../pk's script of the same name, but not verbatim — see DECISIONS.md for the concrete
// adaptations (package discovery reads pnpm-workspace.yaml's real glob list instead of a
// hardcoded `packages/` directory, the dependency graph is derived from eslint-plugin-boundaries
// instead of a newly-configured dependency-cruiser, and adapters.json/contracts.json are derived
// from source instead of a hand-maintained inventory).
//
// Run: pnpm repo-state
//
// Outputs:
//   .repo-state/packages.json          — package graph and inter-package dependencies
//   .repo-state/exports.json           — public export surfaces per package (ts-morph)
//   .repo-state/adapters.json          — adapter inventory, derived from each adapter's own AST
//   .repo-state/contracts.json         — key contract types with their fields (ts-morph)
//   .repo-state/dependency-graph.json  — architecture violations (eslint-plugin-boundaries) +
//                                         the real import graph (ts-morph AST scan)
//   .repo-state/architecture-hash.json — deterministic hash for architectural diff detection
//
// Plain sequential functions, not a @praxis-kit/pipeline chain — this repo's lib/pipeline has no
// builder-chain API (../pk's `startPipeline().then().build()` doesn't exist here), and a single
// linear pass over ~10 steps doesn't need one anyway. Same call already made for
// packages/kit/scripts/postbuild.ts and the root `verify` script. See DECISIONS.md.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { Project, SyntaxKind, Node } from 'ts-morph'
import type { SourceFile, TypeAliasDeclaration, InterfaceDeclaration } from 'ts-morph'
import tseslint from 'typescript-eslint'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'
import architecture from '../configs/architecture.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, '.repo-state')

// ── utilities ─────────────────────────────────────────────────────────────────

function write(name: string, data: unknown): void {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n')
}

function sha256(s: string): string {
  return 'sha256:' + createHash('sha256').update(s).digest('hex').slice(0, 16)
}

function readJson(path: string): AnyRecord {
  return JSON.parse(readFileSync(path, 'utf-8')) as AnyRecord
}

// ── package discovery ─────────────────────────────────────────────────────────
//
// ../pk's discoverPackages() only ever reads readdirSync(join(ROOT, 'packages')) — a real bug,
// not just a porting mismatch: ../pk itself moved every framework adapter to adapters/<name>/
// years ago, so its own generate-repo-state.ts has produced an empty adapters.json/contracts.json
// and a near-empty exports.json (only @praxis-kit/core) on every run since, silently. Reading the
// real pnpm-workspace.yaml glob list instead of one hardcoded directory closes off that whole
// class of staleness — a future new top-level workspace dir doesn't require touching this file.

interface PackageMeta {
  name: string
  version: string
  dir: string
  pkg: AnyRecord
}

// This is a narrow, line-based reader of this repo's own controlled `packages:` list shape
// (quoted, one glob per line, no comments/anchors/flow-style) — not a general YAML parser, and
// not meant to become one. If pnpm-workspace.yaml's style ever changes, update this reader
// rather than reaching for a YAML dependency to parse a 7-line list.
function discoverWorkspaceGlobs(): string[] {
  const text = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
  const lines = text.split('\n')
  const globs: string[] = []
  let inPackages = false

  for (const line of lines) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true
      continue
    }
    if (inPackages) {
      const match = /^\s*-\s*"([^"]+)"\s*$/.exec(line)
      if (match?.[1]) {
        globs.push(match[1])
        continue
      }
      // First non-list-item line ends the `packages:` block.
      break
    }
  }

  return globs
}

// Assumes every workspace glob has the `<dir>/*` shape (true of every entry in this repo's
// pnpm-workspace.yaml today) — a bare directory name or a deeper/exclusion pattern would need
// this function extended, not a generic glob engine bolted on for patterns nothing here uses.
function discoverPackages(): PackageMeta[] {
  const packages: PackageMeta[] = []

  for (const glob of discoverWorkspaceGlobs()) {
    const topDir = join(ROOT, glob.replace(/\/\*$/, ''))
    if (!existsSync(topDir)) continue // e.g. examples/* — glob declared, directory absent

    for (const entry of readdirSync(topDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const dir = join(topDir, entry.name)
      const pkgJsonPath = join(dir, 'package.json')
      if (!existsSync(pkgJsonPath)) continue

      const pkg = readJson(pkgJsonPath)
      packages.push({ name: pkg.name as string, version: pkg.version as string, dir, pkg })
    }
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name))
}

// ── packages.json — manifest graph ──────────────────────────────────────────────
//
// Computed purely from declared package.json dependencies/devDependencies, no AST or lint
// involvement — this logic was already portable from ../pk, just discovery-blind.

// Package name -> the names of its own internal (workspace) dependencies. Reused as both
// packages.json's own dependencyGraph field and detectCycles' input shape — kept as one named
// type since both are the same "declared dependency graph" concept, deliberately distinct from
// dependency-graph.json's AST-scanned packageImports (see buildDependencyGraph below and
// DECISIONS.md: manifest-declared vs. source-derived are two different views on purpose).
type DependencyGraph = StringMap<string[]>

function buildPackageGraph(packages: PackageMeta[]) {
  const internalNames = new Set(packages.map((p) => p.name))

  const pkgMap: StringMap<{
    path: string
    version: string
    internalDeps: string[]
    externalDeps: string[]
    peerDeps: string[]
  }> = {}

  for (const { name, version, dir, pkg } of packages) {
    const allDeps = {
      ...((pkg.dependencies as StringMap<string>) ?? {}),
      ...((pkg.devDependencies as StringMap<string>) ?? {}),
    }
    const peerDeps = Object.keys((pkg.peerDependencies as StringMap<string>) ?? {})
    const internalDeps = Object.keys(allDeps).filter((d) => internalNames.has(d))
    const externalDeps = Object.keys(allDeps).filter(
      (d) => !internalNames.has(d) && !d.startsWith('@types/'),
    )
    pkgMap[name] = { path: relative(ROOT, dir), version, internalDeps, externalDeps, peerDeps }
  }

  const dependencyGraph: DependencyGraph = {}
  for (const [name, info] of Object.entries(pkgMap)) {
    dependencyGraph[name] = info.internalDeps
  }

  return { packages: pkgMap, dependencyGraph, cycles: detectCycles(dependencyGraph) }
}

function detectCycles(graph: DependencyGraph): string[][] {
  // Standard white/gray/black DFS: `onStack` tracks the current recursion path (a back-edge
  // into it is a cycle); `visited` marks a node whose entire reachable subgraph has already
  // been explored once, so later paths into it don't need to redo that work — any cycle
  // reachable from it was already found during its first, complete exploration. `onStack` is
  // checked before `visited` so an active (gray) node is never mistaken for a finished one.
  const cycles: string[][] = []
  const visited = new Set<string>()
  const onStack = new Set<string>()
  const stack: string[] = []

  function dfs(node: string): void {
    if (onStack.has(node)) {
      cycles.push(stack.slice(stack.indexOf(node)))
      return
    }
    if (visited.has(node)) return
    onStack.add(node)
    stack.push(node)
    for (const dep of graph[node] ?? []) dfs(dep)
    stack.pop()
    onStack.delete(node)
    visited.add(node)
  }

  for (const node of Object.keys(graph)) dfs(node)
  return cycles
}

// ── shared ts-morph Project ──────────────────────────────────────────────────
//
// One repo-wide parse, not a fresh Project per package (../pk built N+M of them across
// analyzeExports/extractContracts) — reused by exports, contracts, and the import-graph scan.

function buildProject(packages: PackageMeta[]): Project {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { skipLibCheck: true, noEmit: true },
  })

  for (const { dir } of packages) {
    const srcDir = join(dir, 'src')
    if (!existsSync(srcDir)) continue
    project.addSourceFilesAtPaths([
      join(srcDir, '**/*.{ts,tsx}'),
      `!${join(srcDir, '**/*.test.{ts,tsx}')}`,
      `!${join(srcDir, '**/*.bench.{ts,tsx}')}`,
      `!${join(srcDir, '**/*.spec.{ts,tsx}')}`,
      `!${join(srcDir, '**/*.d.ts')}`,
    ])
  }

  return project
}

// ── exports.json — export surfaces (ts-morph) ─────────────────────────────────

type ExportsMap = StringMap<{ entryPoint: string; values: string[]; types: string[] }>

function analyzeExports(packages: PackageMeta[], project: Project): ExportsMap {
  const result: ExportsMap = {}

  for (const { name, dir } of packages) {
    const indexPath = join(dir, 'src', 'index.ts')
    const indexFile = project.getSourceFile(indexPath)
    if (!indexFile) continue // no src/index.ts — e.g. a CLI-only or CJS-only package

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

// ── adapters.json — inventory, derived from each adapter's own AST ────────────
//
// ../pk hand-lists 2 adapters (react/vue) with hardcoded optionsType/frameworkSpecificOptions,
// looked up against its own (broken) packages/-only discovery — always resolves empty. This repo
// has 7 real adapters; discover them generically via adapters/* and derive optionsType /
// frameworkSpecificOptions from each one's own <Framework>FactoryOptions declaration.

interface AdapterInfo {
  framework: string
  optionsType: string
  frameworkSpecificOptions: string[]
  entryPoints: StringMap<string>
  hasLegacyPath: boolean
  hasSSRTests: boolean
}

const GENERIC_FACTORY_OPTIONS_NAMES = new Set([
  'FactoryOptions',
  'AnyFactoryOptions',
  'ResolvedFactoryOptions',
])

function findOptionsTypeName(types: string[]): string | undefined {
  return types.find((t) => t.endsWith('FactoryOptions') && !GENERIC_FACTORY_OPTIONS_NAMES.has(t))
}

// Derives an adapter's own added fields from its <Framework>FactoryOptions declaration's AST,
// rather than hand-listing them: `interface X extends FactoryOptions<G> { ... }` already exposes
// only its own members via getProperties() (not inherited ones); `type X = FactoryOptions<G> & {
// ... }` requires walking the intersection's own TypeLiteralNode members instead.
//
// The declaration is resolved via getExportedDeclarations() rather than a same-file lookup —
// every adapter's index.ts is a barrel (`export * from './current'`, etc.) that re-exports the
// type from a nested file (e.g. shared/react-options.ts), so a lookup scoped to indexFile itself
// would never find it.
function deriveFrameworkSpecificOptions(indexFile: SourceFile, optionsTypeName: string): string[] {
  const declarations = indexFile.getExportedDeclarations().get(optionsTypeName)
  const decl = declarations?.[0]
  if (!decl) return []

  if (Node.isInterfaceDeclaration(decl)) {
    return decl.getProperties().map((p) => p.getName())
  }

  if (!Node.isTypeAliasDeclaration(decl)) return []

  const typeNode = decl.getTypeNode()
  if (!typeNode || !Node.isIntersectionTypeNode(typeNode)) return []

  const fields: string[] = []
  for (const member of typeNode.getTypeNodes()) {
    if (!Node.isTypeLiteral(member)) continue
    for (const prop of member.getProperties()) fields.push(prop.getName())
  }
  return fields
}

function buildAdaptersMap(
  packages: PackageMeta[],
  exportsMap: ExportsMap,
  project: Project,
): { adapters: StringMap<AdapterInfo> } {
  const adapters: StringMap<AdapterInfo> = {}

  for (const meta of packages) {
    const relDir = relative(ROOT, meta.dir)
    if (!relDir.startsWith('adapters' + '/')) continue

    const framework = relDir.split('/')[1] ?? relDir
    const exported = exportsMap[meta.name]
    const optionsType = (exported && findOptionsTypeName(exported.types)) ?? ''

    const indexFile = project.getSourceFile(join(meta.dir, 'src', 'index.ts'))
    const frameworkSpecificOptions =
      indexFile && optionsType ? deriveFrameworkSpecificOptions(indexFile, optionsType) : []

    const pkgExports = (meta.pkg.exports ?? {}) as AnyRecord
    const entryPoints: StringMap<string> = {}
    for (const [key, val] of Object.entries(pkgExports)) {
      const ep = (val as StringMap<string> | null)?.import
      if (ep) entryPoints[key === '.' ? 'main' : key.replace('./', '')] = ep
    }

    adapters[meta.name] = {
      framework,
      optionsType,
      frameworkSpecificOptions,
      entryPoints,
      hasLegacyPath: existsSync(join(meta.dir, 'src', 'legacy')),
      hasSSRTests:
        existsSync(join(meta.dir, 'src', 'ssr.test.ts')) ||
        existsSync(join(meta.dir, 'src', 'ssr.test.tsx')),
    }
  }

  return { adapters }
}

// ── contracts.json — key contract types (ts-morph) ────────────────────────────
//
// ../pk's extractContracts() does a non-recursive readdirSync(<pkg>/src/types/) — every real
// CONTRACT_NAMES type in this repo lives under a nested subdirectory (types/factory/*.ts,
// types/variants/*.ts, etc.), so a flat scan would find none of them. Filter the already-loaded
// shared Project by path instead of re-reading the filesystem.

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
])

interface ContractEntry {
  name: string
  kind: 'type' | 'interface'
  package: string
  file: string
  fields?: string[]
  genericParams?: string[]
}

function extractContractFromDecl(
  decl: TypeAliasDeclaration | InterfaceDeclaration,
  kind: 'type' | 'interface',
  pkgName: string,
  filePath: string,
): ContractEntry | null {
  if (!CONTRACT_NAMES.has(decl.getName()) || !decl.isExported()) return null

  const fields = Node.isInterfaceDeclaration(decl)
    ? decl.getProperties().map((p) => p.getName())
    : (decl
        .getTypeNode()
        ?.getDescendantsOfKind(SyntaxKind.PropertySignature)
        .map((p) => p.getName()) ?? [])
  const genericParams = decl.getTypeParameters().map((p) => p.getName())

  return {
    name: decl.getName(),
    kind,
    package: pkgName,
    file: relative(ROOT, filePath),
    ...(fields.length > 0 && { fields }),
    ...(genericParams.length > 0 && { genericParams }),
  }
}

function isUnderTypesDir(filePath: string, pkgDir: string): boolean {
  const typesDir = join(pkgDir, 'src', 'types') + '/'
  const typesFile = join(pkgDir, 'src', 'types.ts')
  return filePath.startsWith(typesDir) || filePath === typesFile
}

function extractContracts(
  packages: PackageMeta[],
  project: Project,
): { contracts: ContractEntry[] } {
  const contracts: ContractEntry[] = []

  for (const { name: pkgName, dir } of packages) {
    for (const sf of project.getSourceFiles()) {
      const filePath = sf.getFilePath()
      if (!isUnderTypesDir(filePath, dir)) continue

      for (const ta of sf.getTypeAliases()) {
        const entry = extractContractFromDecl(ta, 'type', pkgName, filePath)
        if (entry) contracts.push(entry)
      }
      for (const iface of sf.getInterfaces()) {
        const entry = extractContractFromDecl(iface, 'interface', pkgName, filePath)
        if (entry) contracts.push(entry)
      }
    }
  }

  return { contracts: contracts.sort((a, b) => a.name.localeCompare(b.name)) }
}

// ── dependency-graph.json — eslint-plugin-boundaries (violations) + a real import scan ─────────
//
// eslint-plugin-boundaries' `boundaries/dependencies` rule reports a pre-rendered message string
// per policy violation — no structured from/to edge data, and it only reports policy failures
// (most allowed imports never get reported at all). So violations come from ESLint directly,
// reusing configs/architecture.ts as the single source of truth (never drifts from what CI
// actually gates); the full package-to-package import graph comes from a separate ts-morph
// AST scan instead — intentionally a *different, source-derived* view from packages.json's
// manifest-declared graph, not a duplicate of it.

interface DependencyViolation {
  package: string
  file: string
  line: number
  column: number
  severity: 'error' | 'warning'
  message: string
}

function packageForFile(packages: PackageMeta[], filePath: string): string {
  const owner = packages.find((p) => filePath.startsWith(p.dir + '/'))
  return owner?.name ?? relative(ROOT, filePath)
}

async function findBoundaryViolations(packages: PackageMeta[]): Promise<DependencyViolation[]> {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    overrideConfig: [...tseslint.configs.recommended, ...architecture],
  })

  const patterns = packages
    .filter((p) => existsSync(join(p.dir, 'src')))
    .map((p) => join(relative(ROOT, p.dir), 'src/**/*.{ts,tsx}'))

  const results = await eslint.lintFiles(patterns)

  const violations: DependencyViolation[] = []
  for (const result of results) {
    for (const message of result.messages) {
      if (message.ruleId !== 'boundaries/dependencies') continue
      violations.push({
        package: packageForFile(packages, result.filePath),
        file: relative(ROOT, result.filePath),
        line: message.line,
        column: message.column,
        severity: message.severity === 2 ? 'error' : 'warning',
        message: message.message,
      })
    }
  }
  return violations
}

// Deliberately not typed as DependencyGraph (above) even though the shape matches — this is the
// AST-scanned *actual* import graph, a different view from packages.json's manifest-declared one.
// See DECISIONS.md.
function scanImportGraph(packages: PackageMeta[], project: Project): StringMap<string[]> {
  const knownNames = new Set(packages.map((p) => p.name))

  function resolvePackageName(specifier: string): string | undefined {
    const segments = specifier.split('/')
    const base = specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
    return base && knownNames.has(base) ? base : undefined
  }

  const edges: StringMap<Set<string>> = {}

  for (const sf of project.getSourceFiles()) {
    const fromPackage = packageForFile(packages, sf.getFilePath())
    if (!knownNames.has(fromPackage)) continue

    const specifiers = [
      ...sf.getImportDeclarations().map((d) => d.getModuleSpecifierValue()),
      ...sf.getExportDeclarations().map((d) => d.getModuleSpecifierValue()),
    ].filter((s): s is string => s !== undefined)

    for (const specifier of specifiers) {
      const toPackage = resolvePackageName(specifier)
      if (!toPackage || toPackage === fromPackage) continue
      edges[fromPackage] ??= new Set()
      edges[fromPackage].add(toPackage)
    }
  }

  return Object.fromEntries(Object.entries(edges).map(([k, v]) => [k, [...v].sort()]))
}

async function buildDependencyGraph(packages: PackageMeta[], project: Project) {
  try {
    const violations = await findBoundaryViolations(packages)
    const packageImports = scanImportGraph(packages, project)
    const hasError = violations.some((v) => v.severity === 'error')
    const hasWarning = violations.some((v) => v.severity === 'warning')

    return {
      status: hasError ? 'VIOLATIONS' : hasWarning ? 'WARNINGS' : 'CLEAN',
      violations,
      packageImports,
    }
  } catch (error) {
    return {
      status: 'ERROR' as const,
      error: error instanceof Error ? error.message : String(error),
      violations: [],
      packageImports: {},
    }
  }
}

// ── architecture-hash.json ────────────────────────────────────────────────────

function buildArchitectureHash(
  pkgGraph: unknown,
  exportsMap: unknown,
  contracts: unknown,
  depGraph: unknown,
) {
  return {
    hash: sha256(JSON.stringify({ pkgGraph, exportsMap, contracts, depGraph })),
    components: {
      packages: sha256(JSON.stringify(pkgGraph)),
      exports: sha256(JSON.stringify(exportsMap)),
      contracts: sha256(JSON.stringify(contracts)),
      dependencyGraph: sha256(JSON.stringify(depGraph)),
    },
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const generated = new Date().toISOString()

  const packages = discoverPackages()
  console.log(`Generating repo state for ${packages.length} packages…`)

  const pkgGraph = buildPackageGraph(packages)
  write('packages.json', { generated, ...pkgGraph })
  console.log('  ✓ packages.json')

  const project = buildProject(packages)

  const exportsMap = analyzeExports(packages, project)
  write('exports.json', { generated, ...exportsMap })
  console.log('  ✓ exports.json')

  const adaptersMap = buildAdaptersMap(packages, exportsMap, project)
  write('adapters.json', { generated, ...adaptersMap })
  console.log('  ✓ adapters.json')

  const contracts = extractContracts(packages, project)
  write('contracts.json', { generated, ...contracts })
  console.log('  ✓ contracts.json')

  const depGraph = await buildDependencyGraph(packages, project)
  write('dependency-graph.json', { generated, ...depGraph })
  console.log(`  ✓ dependency-graph.json  [${depGraph.status}]`)

  const architectureHash = buildArchitectureHash(pkgGraph, exportsMap, contracts, depGraph)
  write('architecture-hash.json', { generated, ...architectureHash })
  console.log('  ✓ architecture-hash.json')

  if (pkgGraph.cycles.length > 0) {
    console.error(`\n⚠  ${pkgGraph.cycles.length} dependency cycle(s) detected:`)
    for (const cycle of pkgGraph.cycles) console.error('   ' + cycle.join(' → '))
  }

  if (depGraph.status === 'ERROR') {
    console.error(`\n✗  Failed to build the dependency graph: ${depGraph.error}`)
    process.exitCode = 1
  } else if (depGraph.status === 'VIOLATIONS') {
    console.error(`\n✗  ${depGraph.violations.length} architectural violation(s):`)
    for (const v of depGraph.violations) {
      console.error(
        `   [${v.severity}] ${v.package} (${v.file}:${v.line}:${v.column}) — ${v.message}`,
      )
    }
    process.exitCode = 1
  } else {
    console.log('\n✓  .repo-state/ written')
  }
}

await main()
