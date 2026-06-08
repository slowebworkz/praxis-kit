import { defineConfig } from 'vite'
import { join } from 'node:path'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      // packages/solid/dist uses esbuild's `jsx: automatic` which generates
      // `import { jsx } from 'solid-js/jsx-runtime'` — an export that doesn't
      // exist. Point Vite at the source so vite-plugin-solid handles JSX correctly.
      '@praxis-kit/solid': join(import.meta.dirname, '../../packages/solid/src/index.ts'),
    },
  },
})
