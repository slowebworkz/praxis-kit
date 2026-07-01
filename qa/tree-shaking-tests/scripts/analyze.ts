/**
 * Builds each scenario directory with esbuild (production, metafile enabled) and
 * writes dist/<scenario>/bundle.js + dist/<scenario>/meta.json for downstream assertion
 * and gzip scripts.
 *
 * Workspace packages are resolved to their TypeScript source so this works without
 * a prior `pnpm build`. The React adapter's internal @/ aliases are handled by a
 * small esbuild plugin matching the same regex patterns as rollup in bundle-analysis.
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
const workspaceAlias: Record<string, string> = {
  '@praxis-kit/pipeline': join(root, 'lib/pipeline/src/index.ts'),
  '@praxis-kit/runtime': join(root, 'runtime/core/src/index.ts'),
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
  '@praxis-kit/primitive': join(root, 'lib/primitive/src/index.ts'),
  '@praxis-kit/styling': join(root, 'lib/styling/src/index.ts'),
  '@praxis-kit/contract': join(root, 'lib/contract/src/index.ts'),
  '@praxis-kit/contract/types': join(root, 'lib/contract/src/types/index.ts'),
  '@praxis-kit/adapter-utils': join(root, 'lib/adapter-utils/src/index.ts'),
}

// The React adapter's source imports its own internal subpath @praxis-kit/react/shared,
// which is a tsconfig-only path (not a published export), so esbuild can't resolve it
// against the package's exports map. This plugin maps it to the adapter's source.
function reactInternalAliasPlugin(): Plugin {
  const re = /^@praxis-kit\/react\/(shared|current|legacy)(\/.*)?$/
  return {
    name: 'react-internal-alias',
    setup(b) {
      b.onResolve({ filter: re }, (args) => {
        const m = re.exec(args.path)
        if (!m) return
        const [, dir, rest = ''] = m
        const resolved = join(root, 'adapters/react/src', dir + rest)
        // Bare alias (no subpath) resolves to the directory's index file.
        return { path: rest ? resolved : resolved + '/index.ts' }
      })
    },
  }
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
    plugins: [reactInternalAliasPlugin(), frameworkExternalPlugin()],
    absWorkingDir: root,
    outfile: join(outDir, 'bundle.js'),
  })

  await writeFile(join(outDir, 'meta.json'), JSON.stringify(result.metafile, null, 2))
  built++
  console.log(`  built  ${scenario}`)
}

console.log(`\n${built} scenario(s) built → dist/`)
