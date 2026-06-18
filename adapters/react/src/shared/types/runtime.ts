import type {
  ClassName,
  DefaultOf,
  ElementType,
  IntrinsicProps,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  ResolvedFactoryOptions,
  VariantsOf,
  createPolymorphic,
} from '@praxis-kit/core'
import type { ResolvedProps, UnknownProps } from './primitives'

export type RuntimeOptions = Readonly<
  Pick<
    ResolvedFactoryOptions,
    | 'defaultTag'
    | 'displayName'
    | 'strict'
    | 'variantKeys'
    | 'childRules'
    | 'allowedAs'
    | 'normalizeFn'
    | 'htmlPropNormalizersFn'
  >
>

export type TagResolver = Readonly<{
  resolveTag(as?: ElementType): ElementType
}>

export type PropsResolver = Readonly<{
  resolveProps(props: UnknownProps): ResolvedProps
}>

export type ClassResolver = Readonly<{
  resolveClasses(
    tag: ElementType,
    props: ResolvedProps,
    className?: ClassName,
    variantKey?: string,
  ): string
}>

export type AriaResolver = Readonly<{
  resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P): { props: P }
}>

/** Widened runtime contract used by the render layer. */
export type Runtime = Readonly<
  TagResolver &
    PropsResolver &
    ClassResolver &
    AriaResolver & {
      options: RuntimeOptions
    }
>

/**
 * Fully-typed runtime that preserves generic parameters from the factory.
 * Used at the build layer; widened to `Runtime` for the render layer.
 */
export type TypedRuntime<G extends PolymorphicGenerics> = ReturnType<
  typeof createPolymorphic<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>
>
