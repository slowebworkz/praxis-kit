export interface ShellPassOptions {
  /** Working directory for the spawned process. Defaults to the caller's cwd. */
  readonly cwd?: string
  /** Environment variables for the spawned process. Defaults to `process.env`. */
  readonly env?: NodeJS.ProcessEnv
  /** Lets the caller cancel a long-running pass. */
  readonly signal?: AbortSignal
}
