import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@praxis-ui/web',
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    // forks mode isolates jsdom workers in subprocesses, preventing
    // HTMLElement circular references from overflowing vitest's IPC serializer.
    pool: 'forks',
  },
})
