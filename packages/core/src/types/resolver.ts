import type { AnyRecord, ClassName, ElementType } from './primitives'

/**
 * The raw input to a resolver pipeline.
 *
 * All fields except `props` are optional — the pipeline fills in defaults
 * (`as` falls back to `defaultTag`, `className` defaults to the computed
 * class string, `children` passes through as-is).
 */
export type ResolveInput<Props extends AnyRecord = AnyRecord> = {
  /** Polymorphic element override. Falls back to the factory's `defaultTag`. */
  as?: ElementType
  props: Props
  className?: ClassName
  /** Selects a named preset from `presetMap`, applied before prop-level variants. */
  variantKey?: string
  children?: unknown
}

/**
 * The fully resolved output of a resolver pipeline.
 *
 * Every field is concrete — no optionals. Framework adapters consume this
 * shape to render the final element.
 */
export type ResolveOutput<Props extends AnyRecord = AnyRecord> = {
  tag: ElementType
  props: Props
  className: ClassName
  children?: unknown
}
