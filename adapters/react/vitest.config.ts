import { defineJsdomConfig } from '../../configs/vitest.base'

export default defineJsdomConfig('react', {
  setupFiles: ['src/test-setup.ts'],
})
