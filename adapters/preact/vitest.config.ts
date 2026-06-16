import { defineJsdomConfig } from '../../configs/vitest.base'

export default defineJsdomConfig('preact', { include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] })
