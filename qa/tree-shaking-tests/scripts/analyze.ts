/**
 * Builds each scenario directory with esbuild (production, metafile enabled) and writes
 * dist/<group>/<scenario>/bundle.js + meta.json for downstream assertion/gzip/report scripts.
 *
 * Two scenario groups, under scenarios/source/ and scenarios/package/, answer different
 * questions:
 *   - source/  — imports `@praxis-kit/<name>` and resolves it straight to this workspace's
 *     TypeScript source (via the `alias` map below). Answers "can esbuild tree-shake our current
 *     source architecture?" No prior build required.
 *   - package/ — imports `praxis-kit/<name>` (the single published package's real subpath) and
 *     resolves it via ordinary node module resolution against `packages/kit`'s *built* dist/ —
 *     no alias at all. Answers "can a customer tree-shake the package we actually publish?"
 *     Requires `pnpm --filter praxis-kit build` to have already run.
 * These are materially different tests — source-graph tree-shakeability doesn't guarantee the
 * built, minified, externals-resolved package tree-shakes the same way, and only the second one
 * is what a real consumer experiences.
 */
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'esbuild'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

const scenariosDir = join(pkg, '../scenarios')
const distDir = join(pkg, '../dist')

// Workspace source aliases (source/ scenarios only) — resolve published packages to their
// TypeScript source.
//
// `@praxis-kit/runtime/compiler` and `@praxis-kit/runtime` (../pk's aliases for its PK2 compiler
// scenarios) are deliberately absent: this repo has no `runtime/compiler` module at all yet
// (`lib/runtime` is flat, no compiler submodule), so the two scenarios that need it
// (`pk2-compiler-minimal`, `pk2-compiler-with-variants`) aren't ported — see DECISIONS.md.
//
// esbuild's `alias` does prefix-matching against unmatched subpaths (an import for
// `@praxis-kit/foo/bar` with no exact `@praxis-kit/foo/bar` key falls back to appending `/bar`
// onto whatever `@praxis-kit/foo` resolves to, which breaks against a single-file target) — every
// subpath actually reachable from these scenarios needs its own explicit entry. `primitive/tag`,
// `/utils`, and `contract/aria/roles`/`/aria/factories`/`/props`/`/types/aria/aria-rule` are extra
// here versus `../pk`'s own alias map: `packages/core/src/{primitive,contract}.ts` in this repo
// were refactored into pass-throughs against more granular barrels (see `DECISIONS.md`
// "`packages/kit` — scaffold"), so this repo's real import graph touches more subpaths than pk's.
const workspaceAlias: Record<string, string> = {
  '@praxis-kit/pipeline': join(root, 'lib/pipeline/src/index.ts'),
  '@praxis-kit/react': join(root, 'adapters/react/src/index.ts'),
  '@praxis-kit/preact': join(root, 'adapters/preact/src/index.ts'),
  '@praxis-kit/vue': join(root, 'adapters/vue/src/index.ts'),
  '@praxis-kit/solid': join(root, 'adapters/solid/src/index.ts'),
  '@praxis-kit/svelte': join(root, 'adapters/svelte/src/index.ts'),
  '@praxis-kit/tailwind': join(root, 'lib/tailwind/src/index.ts'),
  '@praxis-kit/core': join(root, 'packages/core/src/index.ts'),
  '@praxis-kit/core/primitive': join(root, 'packages/core/src/primitive.ts'),
  '@praxis-kit/core/contract': join(root, 'packages/core/src/contract.ts'),
  '@praxis-kit/core/styling': join(root, 'packages/core/src/styling.ts'),
  '@praxis-kit/primitive/types/primitives': join(
    root,
    'lib/primitive/src/types/primitives/index.ts',
  ),
  '@praxis-kit/primitive/types': join(root, 'lib/primitive/src/types/index.ts'),
  '@praxis-kit/primitive/guards/children': join(root, 'lib/primitive/src/guards/children/index.ts'),
  '@praxis-kit/primitive/guards/aria': join(root, 'lib/primitive/src/guards/aria/index.ts'),
  '@praxis-kit/primitive/constants/aria': join(root, 'lib/primitive/src/constants/aria/index.ts'),
  '@praxis-kit/primitive/constants/primitive': join(
    root,
    'lib/primitive/src/constants/primitive/index.ts',
  ),
  '@praxis-kit/primitive/tag': join(root, 'lib/primitive/src/tag/index.ts'),
  '@praxis-kit/primitive/utils': join(root, 'lib/primitive/src/utils/index.ts'),
  '@praxis-kit/contract/aria/factories': join(root, 'lib/contract/src/aria/factories.ts'),
  '@praxis-kit/contract/aria/roles': join(root, 'lib/contract/src/aria/aria-roles.ts'),
  '@praxis-kit/contract/props': join(root, 'lib/contract/src/props/index.ts'),
  '@praxis-kit/contract/types/aria/aria-rule': join(
    root,
    'lib/contract/src/types/aria/aria-rule.ts',
  ),
  '@praxis-kit/adapter-utils': join(root, 'lib/adapter-utils/src/index.ts'),
}

// Consumer-owned runtimes, never bundled — provided by whoever actually installs the package, not
// shipped inside it. One policy, two mechanisms because esbuild's `external` option only takes
// exact strings; subpaths (`solid-js/web`, `preact/compat`, `@lit/reactive-element`, …) and Node
// builtins need the plugin's regex instead. React/Vue/svelte's own root imports are covered by the
// string list; everything scoped under a framework name, plus `node:*`, goes through the plugin.
const consumerExternalStrings = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'vue',
  '@vue/server-renderer',
  'solid-js',
  'preact',
  'svelte',
  'lit',
]

function consumerExternalPlugin(): Plugin {
  const re = /^(solid-js|preact|svelte|lit|lit-html|lit-element)\/|^@lit\/|^@lit-labs\/|^node:/
  return {
    name: 'consumer-external',
    setup(b) {
      b.onResolve({ filter: re }, (args) => ({ path: args.path, external: true }))
    },
  }
}

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
      'scenarios/package/* import the published `praxis-kit` package, which has no dist/ yet — ' +
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
