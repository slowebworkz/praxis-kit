// ─────────────────────────────────────────────────────────────────────────────
// Basic Types
// ─────────────────────────────────────────────────────────────────────────────

/** A tuple of positional arguments. */
export type Arguments = readonly unknown[]

/** Any callable function. */
export type AnyFunction<TArgs extends Arguments = Arguments, TReturn = unknown> = (
  ...args: TArgs
) => TReturn

// ─────────────────────────────────────────────────────────────────────────────
// Intermediate Types
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
 * A tuple of pipelines that all accept the same argument list while preserving
 * each pipeline's individual output type.
 *
 * This allows a fixed-length collection of pipelines to retain its per-index
 * type information, much like `Promise.all()` preserves the resolved type of
 * each promise in a tuple.
 */
export type PipelineTuple<TArgs extends Arguments, TOutputs extends Arguments> = {
  [K in keyof TOutputs]: Pipeline<TArgs, TOutputs[K]>
}

/** A function that accepts exactly one argument. */
export type UnaryFunction<TInput, TOutput> = AnyFunction<[TInput], TOutput>

/**
 * A pipeline that accepts exactly one input value.
 *
 * Unary pipelines are primarily used when composing pipelines, where each stage
 * consumes the output of the previous stage.
 */
export type PipelineStage<TInput, TOutput> = Pipeline<[TInput], TOutput>

/**
 * Extracts the tuple of positional arguments accepted by a pipeline.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PipelineInput<T extends Pipeline<any, any>> = Parameters<T>

/**
 * Extracts the value produced by a pipeline.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PipelineOutput<T extends Pipeline<any, any>> = ReturnType<T>

export type Tuple = readonly unknown[]
