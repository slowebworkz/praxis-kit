import { spawn } from 'node:child_process'
import type { Pass, PassResult, ShellPassOptions } from '../types'

/**
 * Wraps a shell command as a `Pass`. Output is streamed directly via inherited
 * stdio rather than buffered. Any non-zero exit status or process error rejects
 * the promise, allowing pipeline execution to fail using the same error
 * handling as any other pass.
 */
export function shellPass<TContext>(
  name: string,
  command: string,
  args: readonly string[] = [],
  options: ShellPassOptions = {},
): Pass<TContext> {
  return {
    name,
    execute(): Promise<PassResult<TContext>> {
      return new Promise((resolve, reject) => {
        const { cwd, env, signal } = options
        const child = spawn(command, args, { stdio: 'inherit', cwd, env, signal })

        // close (not exit) waits for the inherited stdio streams to finish
        // flushing, avoiding a race where the promise resolves before the
        // last output is written. `once` (not `on`) makes it explicit that
        // only the first of error/close settles the promise.
        child.once('error', reject)
        child.once('close', (code, terminationSignal) => {
          if (code === 0) {
            resolve({})
            return
          }
          if (terminationSignal !== null) {
            reject(new Error(`Pass "${name}" was terminated by signal ${terminationSignal}`))
            return
          }
          reject(
            new Error(
              `Pass "${name}" failed: "${command} ${args.join(' ')}" exited with code ${code}`,
            ),
          )
        })
      })
    },
  }
}
