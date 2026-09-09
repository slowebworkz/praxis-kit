/**
 * Builds each scenario directory with esbuild (production, metafile enabled) and writes
 * dist/<group>/<scenario>/bundle.js + meta.json for downstream leak-check/gzip/report scripts.
 *
 * Two scenario groups answer different questions, reusing tree-shaking-tests' own vocabulary
 * rather than reinventing it:
 *   - source/  — imports `@praxis-kit/<name>` and resolves it straight to this workspace's
 *     TypeScript source. Gives real per-original-file `bytesInOutput` composition data (esbuild's
 *     metafile), which does not survive into packages/kit's already-tsdown-bundled dist output
 *     (rolldown collapses many source modules into one physical chunk). Only the 9 entries with a
 *     real workspace-source counterpart get a source/* scenario (react, react-legacy, preact, vue,
 *     solid, svelte, lit, web, tailwind) — contract/guards/html/utils are pass-through re-export
 *     files that live *in* packages/kit itself (packages/kit/{contract,guards,html,utils}.ts), not
 *     a distinct workspace package with its own source tree, so there's no separate "resolve to
 *     source" question to ask for them beyond what the existing @praxis-kit/core and
 *     @praxis-kit/primitive source scenarios (in tree-shaking-tests) already answer.
 *   - package/ — imports `praxis-kit/<name>` and resolves it via ordinary node module resolution
 *     against packages/kit's *built* dist/ — no alias at all. Every one of the 13 scope entries
 *     gets a package/* scenario: this is the tier that answers "what does a real consumer actually
 *     get," which is a meaningful question for all 13 regardless of whether a source-tier
 *     counterpart exists. Requires `pnpm --filter praxis-kit build` to have already run.
 *
 * Unlike tree-shaking-tests' minimal-usage scenarios (import one symbol, export just that), every
 * scenario here does `export * from '<specifier>'` — the entire public surface of the entry, not
 * one function. That's deliberate: this tool measures the real total cost of an entry point people
 * actually import, not the smallest possible slice of it (tree-shaking-tests already covers that
 * question well). See DECISIONS.md for the full scope rationale, including what was deliberately
 * not ported from ../pk's original `.size-limit.json` fixtures.
 */
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  workspaceAlias,
  consumerExternalStrings,
  consumerExternalPlugin,
} from '@praxis-kit/tree-shaking-tests'
import { extraWorkspaceAlias } from './workspace-alias.ts'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

const scenariosDir = join(pkg, '../scenarios')
const distDir = join(pkg, '../dist')

const sourceAlias = { ...workspaceAlias, ...extraWorkspaceAlias }

async function listScenarios(groupDir: string): Promise<string[]> {
  if (!existsSync(groupDir)) return []
  const entries = await readdir(groupDir, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

// Fails loudly and specifically rather than letting esbuild's own "file not found" surface for an
// entry point that was never there — a scenario directory with no entry.ts is a broken fixture,
// not an esbuild problem.
function assertScenarioSchema(group: string, scenario: string, entryPoint: string): void {
  if (!existsSync(entryPoint)) {
    throw new Error(
      `scenario "${group}/${scenario}" is missing entry.ts (expected at ${entryPoint}) — ` +
        `every scenario directory needs an entry.ts`,
    )
  }
}

let built = 0

for (const group of ['source', 'package'] as const) {
  const groupDir = join(scenariosDir, group)
  const scenarios = await listScenarios(groupDir)
  if (scenarios.length === 0) continue

  if (group === 'package' && !existsSync(join(root, 'packages/kit/dist'))) {
    throw new Error(
      'scenarios/package/* consume `packages/kit`, which has no dist/ yet — ' +
        'run `pnpm --filter praxis-kit build` first.',
    )
  }

  for (const scenario of scenarios) {
    const entryPoint = join(groupDir, scenario, 'entry.ts')
    assertScenarioSchema(group, scenario, entryPoint)

    const outDir = join(distDir, group, scenario)
    await mkdir(outDir, { recursive: true })

    const result = await build({
      entryPoints: [entryPoint],
      bundle: true,
      minify: true,
      format: 'esm',
      treeShaking: true,
      metafile: true,
      sourcemap: false,
      platform: 'browser',
      conditions: ['import', 'module'],
      external: consumerExternalStrings,
      // `package/` scenarios resolve `praxis-kit/*` for real (node module resolution against
      // packages/kit's built dist/) — no alias at all, that's the whole point.
      alias: group === 'source' ? sourceAlias : {},
      plugins: [consumerExternalPlugin()],
      absWorkingDir: root,
      outfile: join(outDir, 'bundle.js'),
    })

    await writeFile(join(outDir, 'meta.json'), JSON.stringify(result.metafile, null, 2))
    built++
    console.log(`  built  ${group}/${scenario}`)
  }
}

console.log(`\n${built} scenario(s) built → dist/`)
