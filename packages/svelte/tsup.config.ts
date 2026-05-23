import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Svelte itself is a peer dependency; the .svelte component file is
  // distributed as source (listed in package.json "files") and compiled
  // by the consumer's bundler.
  external: ['svelte', 'svelte/*'],
})
