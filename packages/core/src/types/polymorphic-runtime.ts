import type { Simplify } from 'type-fest'
import type { ClassPlugin } from './class-plugin'
import type { AnyRecord, ClassName, ElementType } from './primitives'
import type { ResolvedFactoryOptions } from './resolved-factory-options'
import type { VariantMap, VariantProps } from './variant'

/* ---------------------------------- */
/* Resolvers                          */
/* ---------------------------------- */

export type ResolveTagFn<TDefault extends ElementType> = {
  (): TDefault
  <T extends ElementType>(as: T): T
}

type ResolvePropsFn<Props extends AnyRecord> = <P extends AnyRecord>(
  props: P,
) => Simplify<Omit<Partial<Props>, keyof P> & P>

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
  TPreset extends Readonly<Record<string, Partial<VariantProps<Variants>>>> = Readonly<
    Record<string, Partial<VariantProps<Variants>>>
  >,
> = {
  /**
   * Normalized, read-only factory configuration.
   * Single source of truth for runtime behavior.
   */
  readonly options: Readonly<ResolvedFactoryOptions<TDefault, Props, Variants, TPreset>>

  /** Instantiated plugin, present when `classPlugin` was supplied to the factory. */
  readonly classPlugin?: ClassPlugin

  /**
   * Resolves the final element type.
   * Supports polymorphic `as` overrides.
   */
  readonly resolveTag: ResolveTagFn<TDefault>

  /**
   * Merges default + incoming props into a final prop object.
   */
  readonly resolveProps: ResolvePropsFn<Props>

  /**
   * Computes final class string from:
   * - tag
   * - props
   * - base className
   * - variant key (slot/segment support)
   */
  readonly resolveClasses: ResolveClassesFn<Props, TKeys>
}
