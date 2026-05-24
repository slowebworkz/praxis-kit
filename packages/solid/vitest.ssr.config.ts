import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid({ ssr: true })],
  resolve: {
    alias: {
      '@polymorphic-ui/core': new URL('../core/src/index.ts', import.meta.url).pathname,
      '@polymorphic-ui/primitive': new URL('../../lib/primitive/src', import.meta.url).pathname,
      '@polymorphic-ui/contract': new URL('../../lib/contract/src', import.meta.url).pathname,
      '@polymorphic-ui/styling': new URL('../../lib/styling/src', import.meta.url).pathname,
      '@polymorphic-ui/adapter-utils': new URL('../../lib/adapter-utils/src', import.meta.url)
        .pathname,
    },
    // No 'browser' condition — resolves solid-js/web to its server build,
    // which supports renderToString (the browser build throws).
    conditions: ['development'],
  },
  test: {
    name: 'solid-ssr',
    include: ['src/ssr.test.tsx'],
    environment: 'node',
  },
})
