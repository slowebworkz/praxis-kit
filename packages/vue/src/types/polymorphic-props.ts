import type { AllowedComponentProps } from 'vue'
import type { Simplify } from 'type-fest'
import type {
  ClassName,
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@polymorphic-ui/core'
import type { UnknownProps } from './primitives'

type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = PropsOf<G> &
  VariantProps<VariantsOf<G>> & {
    as?: TAs
    class?: ClassName
    variantKey?: keyof PresetOf<G>
  }

/**
 * Props for the normal (non-slot) render path. `asChild` is absent or `false`.
 *
 * `AllowedComponentProps` adds Vue system props (`key`, `ref`, lifecycle hooks).
 * `UnknownProps` allows HTML attributes that aren't explicitly enumerated.
 */
export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<ControlProps<G, TAs> & AllowedComponentProps & { asChild?: false } & UnknownProps>

/**
 * Props for the slot render path (`asChild: true`). `as` is forbidden — combining
 * `as` with `asChild` is a runtime invariant violation, so it is rejected at the
 * type level too.
 */
export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<
  ControlProps<G, TAs> &
    AllowedComponentProps & {
      asChild: true
      as?: never
    } & UnknownProps
>

/**
 * A Vue polymorphic component typed for use in templates and JSX via the
 * `new()` instance-constructor pattern that Volar uses for prop checking.
 *
 * Unlike React's overloaded call signatures, Vue has no per-call-site generic
 * inference for `as`, so HTML attribute narrowing based on the `as` value is
 * not available — `UnknownProps` captures the open-ended attribute surface instead.
 */
export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  new (): {
    $props: PolymorphicProps<G> | PolymorphicWithAsChild<G>
  }
  displayName?: string
}
