import { defineJsdomConfig } from '../../configs/vitest.base'

export default defineJsdomConfig('example-preact', {
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
})
