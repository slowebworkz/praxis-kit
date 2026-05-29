import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'rollup'
import alias from '@rollup/plugin-alias'
import resolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

const entry = (pkg: string, ...src: string[]) => join(root, 'packages', pkg, 'src', ...src)

const fixture = (...src: string[]) => join(__dirname, 'src', ...src)

// Workspace packages that aren't hoisted to a path node-resolve can find from
// deep in the source tree (pnpm isolation). Map them directly to their source.
const workspaceAlias = () =>
  alias({
    entries: [
      {
        find: '@praxis-ui/adapter-utils',
        replacement: join(root, 'lib/adapter-utils/src/index.ts'),
      },
    ],
  })

// @/shared and @/current are internal React adapter path aliases (tsconfig-only)
const reactAlias = () =>
  alias({
    entries: [
      { find: /^@\/shared(\/.*)?$/, replacement: join(root, 'packages/react/src/shared$1') },
      { find: /^@\/current(\/.*)?$/, replacement: join(root, 'packages/react/src/current$1') },
    ],
  })

// Framework peer deps — provided by the consumer, not bundled
const frameworkExternal = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/server',
  'vue',
  '@vue/server-renderer',
  'solid-js',
  /^solid-js\//,
  'preact',
  /^preact\//,
  'svelte',
  /^svelte\//,
]

const base = () => [
  resolve({ extensions: ['.ts', '.tsx'], exportConditions: ['import', 'module'] }),
  esbuild({ target: 'esnext' }),
]

export default defineConfig([
  // core — four entry points; each sub-entry should be independent
  {
    input: {
      index: entry('core', 'index.ts'),
      primitive: entry('core', 'primitive.ts'),
      contract: entry('core', 'contract.ts'),
      styling: entry('core', 'styling.ts'),
    },
    plugins: [...base(), visualizer({ filename: 'stats/core.html', open: false, gzipSize: true })],
    output: { dir: 'dist/core', format: 'esm' },
  },

  // react — current (React 19) and legacy (React 18) split
  {
    input: {
      current: entry('react', 'index.ts'),
      legacy: entry('react', 'legacy', 'index.ts'),
    },
    external: frameworkExternal,
    plugins: [
      workspaceAlias(),
      reactAlias(),
      ...base(),
      visualizer({ filename: 'stats/react.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/react', format: 'esm' },
  },

  // vue
  {
    input: { index: entry('vue', 'index.ts') },
    external: frameworkExternal,
    plugins: [
      workspaceAlias(),
      ...base(),
      visualizer({ filename: 'stats/vue.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/vue', format: 'esm' },
  },

  // tailwind — no framework peer dep
  {
    input: { index: entry('tailwind', 'index.ts') },
    plugins: [
      ...base(),
      visualizer({ filename: 'stats/tailwind.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/tailwind', format: 'esm' },
  },

  // solid — needs jsxImportSource override
  {
    input: { index: entry('solid', 'index.ts') },
    external: frameworkExternal,
    plugins: [
      workspaceAlias(),
      resolve({ extensions: ['.ts', '.tsx'], exportConditions: ['import', 'module'] }),
      esbuild({ target: 'esnext', jsx: 'automatic', jsxImportSource: 'solid-js' }),
      visualizer({ filename: 'stats/solid.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/solid', format: 'esm' },
  },

  // preact
  {
    input: { index: entry('preact', 'index.ts') },
    external: frameworkExternal,
    plugins: [
      workspaceAlias(),
      ...base(),
      visualizer({ filename: 'stats/preact.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/preact', format: 'esm' },
  },

  // svelte — .svelte files are compiled by the consumer; treat as external
  {
    input: { index: entry('svelte', 'index.ts') },
    external: [...frameworkExternal, /\.svelte$/],
    plugins: [
      workspaceAlias(),
      ...base(),
      visualizer({ filename: 'stats/svelte.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/svelte', format: 'esm' },
  },

  // Scenario fixtures — architecture retention claims (React + Vue)
  // Each fixture isolates a specific capability tier to verify tree-shaking boundaries
  {
    input: {
      'react-minimal': fixture('react-minimal.ts'),
      'react-enforcement': fixture('react-enforcement.ts'),
      'react-variants': fixture('react-variants.ts'),
      'react-tailwind': fixture('react-tailwind.ts'),
      'vue-minimal': fixture('vue-minimal.ts'),
    },
    external: frameworkExternal,
    plugins: [
      workspaceAlias(),
      reactAlias(),
      resolve({ extensions: ['.ts', '.tsx'], exportConditions: ['import', 'module'] }),
      esbuild({ target: 'esnext', jsx: 'automatic', jsxImportSource: 'react' }),
      visualizer({ filename: 'stats/scenarios.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/scenarios', format: 'esm' },
  },

  // Solid scenario fixture — separate config because render.tsx needs solid-js JSX transform
  {
    input: { 'solid-minimal': fixture('solid-minimal.ts') },
    external: frameworkExternal,
    plugins: [
      workspaceAlias(),
      resolve({ extensions: ['.ts', '.tsx'], exportConditions: ['import', 'module'] }),
      esbuild({ target: 'esnext', jsx: 'automatic', jsxImportSource: 'solid-js' }),
      visualizer({ filename: 'stats/scenarios-solid.html', open: false, gzipSize: true }),
    ],
    output: { dir: 'dist/scenarios-solid', format: 'esm' },
  },
])
