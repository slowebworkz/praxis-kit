import type { AnyRecord, ClassName, ElementType } from './primitives'
import type { StrictMode } from './strict-mode'

/**
 * The configuration passed to `createResolverPipeline`.
 *
 * A structural subset of `ResolvedFactoryOptions` — only the fields the
 * resolver pipeline needs directly. Keeping this narrow lets the function
 * accept any compatible options shape without pulling in the full generic.
 */
export type ResolverOptions = {
  defaultTag: ElementType
  defaultProps?: AnyRecord
  strict?: StrictMode
  allowedAs?: readonly ElementType[]
  displayName?: string
}

/**
 * The raw input to a resolver pipeline.
 *
 * All fields except `props` are optional — the pipeline fills in defaults
 * (`as` falls back to `defaultTag`, `className` defaults to the computed
 * class string, `children` passes through as-is).
 */
export type ResolveInput<
  Props extends AnyRecord = AnyRecord,
  TSlot extends string = string,
  Children = unknown,
> = {
  /** Polymorphic element override. Falls back to the factory's `defaultTag`. */
  as?: ElementType
  props: Props
  className?: ClassName
  /** Selects a named recipe from `recipeMap`, applied before prop-level variants. */
  recipe?: TSlot
  children?: Children
}

/**
 * The fully resolved output of a resolver pipeline.
 *
 * Every field is concrete — no optionals. Framework adapters consume this
 * shape to render the final element.
 */
export type ResolveOutput<Props extends AnyRecord = AnyRecord, Children = unknown> = {
  tag: ElementType
  props: Props
  className: ClassName
  children?: Children
}
