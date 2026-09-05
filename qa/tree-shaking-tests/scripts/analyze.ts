/**
 * Builds each scenario directory with esbuild (production, metafile enabled) and
 * writes dist/<scenario>/bundle.js + dist/<scenario>/meta.json for downstream assertion
 * and gzip scripts.
 *
 * Workspace packages are resolved to their TypeScript source so this works without
 * a prior `pnpm build`.
 */
import { build } from 'esbuild'
import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'esbuild'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

const scenariosDir = join(pkg, '../scenarios')
const distDir = join(pkg, '../dist')

// Workspace source aliases — resolve published packages to their TypeScript source.
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
  '@praxis-kit/primitive': join(root, 'lib/primitive/src/index.ts'),
  '@praxis-kit/styling': join(root, 'lib/styling/src/index.ts'),
  '@praxis-kit/contract': join(root, 'lib/contract/src/index.ts'),
  '@praxis-kit/contract/types': join(root, 'lib/contract/src/types/index.ts'),
  '@praxis-kit/adapter-utils': join(root, 'lib/adapter-utils/src/index.ts'),
}

// Framework peer dependencies — provided by consumer, not bundled.
// Exact-string externals cover the root import; the plugin handles subpath patterns.
const externalStrings = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'vue',
  '@vue/server-renderer',
  'solid-js',
  'preact',
  'svelte',
]

// esbuild's `external` option only accepts strings; regex patterns need a plugin.
function frameworkExternalPlugin(): Plugin {
  // Covers framework subpaths (solid-js/web, preact/compat, etc.) and Node built-ins
  // (node:crypto, node:fs, …) used by PK2 compiler scenarios.
  const re = /^(solid-js|preact|svelte)\/|^node:/
  return {
    name: 'framework-external',
    setup(b) {
      b.onResolve({ filter: re }, (args) => ({ path: args.path, external: true }))
    },
  }
}

const scenarios = await readdir(scenariosDir, { withFileTypes: true }).then((entries) =>
  entries.filter((e) => e.isDirectory()).map((e) => e.name),
)

let built = 0

for (const scenario of scenarios) {
  const entryPoint = join(scenariosDir, scenario, 'entry.ts')
  const outDir = join(distDir, scenario)
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
    external: externalStrings,
    alias: workspaceAlias,
    plugins: [frameworkExternalPlugin()],
    absWorkingDir: root,
    outfile: join(outDir, 'bundle.js'),
  })

  await writeFile(join(outDir, 'meta.json'), JSON.stringify(result.metafile, null, 2))
  built++
  console.log(`  built  ${scenario}`)
}

console.log(`\n${built} scenario(s) built → dist/`)
