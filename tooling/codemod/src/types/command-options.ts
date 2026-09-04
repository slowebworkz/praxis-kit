import type { TransformOptions } from './transform.js'

export interface CommandOptions extends TransformOptions {
  help: boolean
  files: string
  tsconfig?: string
}

export interface RenameLikeOptions extends CommandOptions {
  from: string
  to: string
}
