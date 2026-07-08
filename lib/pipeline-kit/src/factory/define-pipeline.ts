import type { Pipeline, Arguments } from '../core/types'
import type { PipelineFactory, ResolvedConfig } from './types'

/** Wraps a PipelineFactory, memoizing the built Pipeline by the resolved config's object
 *  identity. Resolved options are already frozen per-component throughout this codebase
 *  (e.g. resolveFactoryOptions's `Object.freeze(...)`), so a WeakMap keyed on that same frozen
 *  reference is a safe, free cache — calling a factory twice with the same resolved reference
 *  doesn't redundantly rebuild internal resolvers. Modeled on the defineConfig-style helper
 *  convention (Vite/Vitest) for clean generic inference at the call site.
 *
 *  Note: the return type is intentionally the plain `PipelineFactory`, not wrapped in
 *  type-fest's `Simplify` — Simplify flattens object/intersection types for cleaner hover
 *  tooltips, but applying it to a callable type breaks the contextual typing TypeScript needs
 *  to infer the returned function's own parameter type. */
export function definePipeline<TResolved extends ResolvedConfig, TArgs extends Arguments, TOutput>(
  factory: PipelineFactory<TResolved, TArgs, TOutput>,
): PipelineFactory<TResolved, TArgs, TOutput> {
  const cache = new WeakMap<TResolved, Pipeline<TArgs, TOutput>>()
  return (resolved: TResolved) => {
    let pipeline = cache.get(resolved)
    if (!pipeline) {
      pipeline = factory(resolved)
      cache.set(resolved, pipeline)
    }
    return pipeline
  }
}
