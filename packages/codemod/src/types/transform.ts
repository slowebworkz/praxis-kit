export interface TransformOptions {
  isDryRun: boolean
  isVerbose: boolean
}

export interface RenameOptions extends TransformOptions {
  from: string
  to: string
}
