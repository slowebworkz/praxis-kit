import { defineJsdomConfig } from '../../configs/vitest.base'

export default defineJsdomConfig('react', {
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  setupFiles: ['src/test-setup.ts'],
})
