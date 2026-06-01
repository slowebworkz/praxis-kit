import type { AnyRecord, ClassPlugin, ClassPipelineFn } from '../types'

// Bundlers (esbuild, Rollup, webpack) replace process.env.NODE_ENV with a string literal,
// enabling dead-code elimination of the dev guard in production builds.
declare const process: { env: { NODE_ENV: string } }

function panic(message: string): never {
  throw new Error(message)
}

export function assertPluginShape(result: unknown): asserts result is ClassPlugin {
  if (result === null || typeof result !== 'object')
    panic(
      `[praxis-ui] Plugin factory must return an object with a 'pipeline' function. Got: ${result === null ? 'null' : typeof result}.`,
    )
  const plugin = result as AnyRecord
  if (typeof plugin.pipeline !== 'function')
    panic(
      `[praxis-ui] Plugin factory return value is missing a 'pipeline' function. Got pipeline: ${typeof plugin.pipeline}.`,
    )
}

export function guardPipeline(pipeline: ClassPipelineFn): ClassPipelineFn {
  if (process.env.NODE_ENV === 'production') return pipeline
  return function guardedPipeline(tag, props, className, variantKey) {
    const result = pipeline(tag, props, className, variantKey)
    if (typeof result !== 'string')
      panic(`[praxis-ui] Plugin pipeline must return a string. Got: ${typeof result}.`)
    return result
  }
}
