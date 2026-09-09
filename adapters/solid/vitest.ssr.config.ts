import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid({ ssr: true })],
  resolve: {
    tsconfigPaths: true,
    // No 'browser' condition — resolves solid-js/web to its server build,
    // which supports renderToString (the browser build throws).
    conditions: ['development'],
  },
  test: {
    name: 'solid-ssr',
    include: ['src/ssr.test.tsx', 'src/hydration-parity.test.tsx'],
    environment: 'node',
  },
})
