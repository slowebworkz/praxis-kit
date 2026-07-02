import { defineJsdomConfig } from '../../configs/vitest.base'

export default defineJsdomConfig('vue', {
  exclude: ['src/**/*.pw.spec.ts'],
})
