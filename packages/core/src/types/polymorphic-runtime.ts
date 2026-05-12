import type { Simplify } from 'type-fest'
import type { AnyRecord, ClassName, ElementType } from './primitives'
import type { ResolvedFactoryOptions } from './resolved-factory-options'
import type { VariantMap } from './variant'

/* ---------------------------------- */
/* Resolvers                          */
/* ---------------------------------- */

type ResolveTagFn<TDefault extends ElementType> = {
  (): TDefault
  <T extends ElementType>(as: T): T
}

type ResolvePropsFn<Props extends AnyRecord> = <P extends AnyRecord>(
  props: P,
) => Simplify<Partial<Props> & P>

type ResolveClassesFn<Props extends AnyRecord, TKeys extends string = never> = (
  tag: ElementType,
  props: Props,
  className?: ClassName,
  variantKey?: TKeys,
) => string

/* ---------------------------------- */
/* Runtime API                        */
/* ---------------------------------- */

export type PolymorphicRuntime<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends VariantMap,
  TKeys extends string = never,
> = {
  /**
   * Normalized, immutable factory configuration.
   * Single source of truth for runtime behavior.
   */
  readonly options: Readonly<ResolvedFactoryOptions<TDefault, Props, Variants>>

  /**
   * Resolves the final element type.
   * Supports polymorphic `as` overrides.
   */
  resolveTag: ResolveTagFn<TDefault>

  /**
   * Merges default + incoming props into a final prop object.
   */
  resolveProps: ResolvePropsFn<Props>

  /**
   * Computes final class string from:
   * - tag
   * - props
   * - base className
   * - variant key (slot/segment support)
   */
  resolveClasses: ResolveClassesFn<Props, TKeys>
}
