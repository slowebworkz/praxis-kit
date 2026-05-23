import type {
  ClassName,
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  ResolvedFactoryOptions,
  VariantsOf,
  createPolymorphic,
} from '@polymorphic-ui/core'
import type { ResolvedProps, UnknownProps, VariantKey } from './primitives'

export type RuntimeOptions = Readonly<
  Pick<ResolvedFactoryOptions, 'displayName' | 'strict' | 'variantKeys' | 'childRules'>
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
    variantKey?: VariantKey,
  ): string
}>

export type Runtime = Readonly<
  TagResolver &
    PropsResolver &
    ClassResolver & {
      options: RuntimeOptions
    }
>

export type TypedRuntime<G extends PolymorphicGenerics> = ReturnType<
  typeof createPolymorphic<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>
>
