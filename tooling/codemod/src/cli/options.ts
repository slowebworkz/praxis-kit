import { DEFAULT_FROM, DEFAULT_TO } from './constants.js'

export const sharedOptions = {
  'dry-run': { type: 'boolean', default: false },
  verbose: { type: 'boolean', default: false },
  help: { type: 'boolean', default: false },
} as const

export const renameOptions = {
  from: { type: 'string', default: DEFAULT_FROM },
  to: { type: 'string', default: DEFAULT_TO },
} as const

export const tsconfigOption = {
  tsconfig: { type: 'string' },
} as const
