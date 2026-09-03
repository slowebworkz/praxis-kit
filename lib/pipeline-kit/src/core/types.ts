// ─────────────────────────────────────────────────────────────────────────────
// Foundational Types
// ─────────────────────────────────────────────────────────────────────────────

/** A fixed-length tuple of values. */
export type Tuple = readonly unknown[]

/**
 * A tuple of positional arguments accepted by a function.
 */
export type Arguments = Tuple

/**
 * Any callable function.
 */
export type AnyFunction<TArgs extends Arguments = Arguments, TReturn = unknown> = (
  ...args: TArgs
) => TReturn

/**
 * A function that accepts exactly one argument.
 */
export type UnaryFunction<TInput, TOutput> = AnyFunction<[TInput], TOutput>

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A callable pipeline.
 *
 * A `Pipeline` accepts a tuple of positional arguments and produces a value.
 * It represents the common function contract shared by all pipeline
 * implementations, regardless of how they are created or composed.
 */
export type Pipeline<TArgs extends Arguments, TOutput> = AnyFunction<TArgs, TOutput>

/**
 * A unary pipeline stage.
 *
 * Pipeline stages are primarily used during composition, where each stage
 * consumes the output of the previous pipeline.
 */
export type PipelineStage<TInput, TOutput> = UnaryFunction<TInput, TOutput>

/**
 * A tuple of pipelines that all accept the same argument list while preserving
 * the output type at each corresponding index.
 *
 * Similar to how `Promise.all()` preserves the resolved type of each promise in
 * a tuple.
 */
export type PipelineTuple<TArgs extends Arguments, TOutputs extends Tuple> = {
  [K in keyof TOutputs]: Pipeline<TArgs, TOutputs[K]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the positional argument tuple accepted by a pipeline.
 */
export type PipelineInput<T> = T extends Pipeline<infer TArgs, unknown> ? TArgs : never

/**
 * Extracts the value produced by a pipeline.
 */
export type PipelineOutput<T> = T extends Pipeline<Arguments, infer TOutput> ? TOutput : never
