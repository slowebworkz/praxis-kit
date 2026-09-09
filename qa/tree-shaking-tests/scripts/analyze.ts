/**
 * Builds each scenario directory with esbuild (production, metafile enabled) and writes
 * dist/<group>/<scenario>/bundle.js + meta.json for downstream assertion/gzip/report scripts.
 *
 * Two scenario groups, under scenarios/source/ and scenarios/package/, answer different
 * questions:
 *   - source/  — imports `@praxis-kit/<name>` and resolves it straight to this workspace's
 *     TypeScript source (via the `alias` map below). Answers "can esbuild tree-shake our current
 *     source architecture?" No prior build required.
 *   - package/ — imports `praxis-kit/<name>` and resolves it via ordinary node module resolution
 *     against `packages/kit`'s *built* dist/ — no alias at all. This is **package-consumption
 *     testing**, not published-package testing: resolution goes through the pnpm workspace link
 *     (`node_modules/praxis-kit` → `packages/kit`), not an actual `pnpm pack` tarball installed
 *     into an isolated consumer, so it doesn't cover `files`/npm packing/`.npmignore`/package
 *     metadata the way a real install would (`packages/kit/scripts/smoke-test.ts` does that, for
 *     the kit package itself). It still answers a real, different question from `source/`: "does
 *     the built, minified, externals-resolved JS this workspace produces actually tree-shake,"
 *     not just "does the source graph." Requires `pnpm --filter praxis-kit build` to have already
 *     run. A `pnpm pack`-based version of this scenario group, for genuine published-package
 *     testing, is a real follow-up — see DECISIONS.md.
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
} from './workspace-resolution.ts'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

const scenariosDir = join(pkg, '../scenarios')
const distDir = join(pkg, '../dist')

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
        `every scenario directory needs an entry.ts and an expected.json`,
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
      alias: group === 'source' ? workspaceAlias : {},
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
