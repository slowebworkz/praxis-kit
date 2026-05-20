import type { Simplify } from 'type-fest'
import type { ClassPlugin } from './class-plugin'
import type { AnyRecord, ClassName, ElementType, IntrinsicProps } from './primitives'
import type { ResolvedFactoryOptions } from './resolved-factory-options'
import type { VariantMap, VariantProps } from './variant'

/* ---------------------------------- */
/* Resolvers                          */
/* ---------------------------------- */

export type ResolveTagFn<TDefault extends ElementType> = <
  T extends ElementType | undefined = undefined,
>(
  as?: T,
) => T extends ElementType ? T : TDefault

// Omit<Props, keyof P> & P models overwrite semantics: P wins on any shared key.
// Props & P would intersect literal types, collapsing shared keys to `never`.
type ResolvePropsFn<Props extends AnyRecord> = <P extends Partial<Props>>(
  props: P,
) => Simplify<Omit<Props, keyof P> & P>

type ResolveClassNameFn<Props extends AnyRecord, TSlot extends string = never> = (
  tag: ElementType,
  props: Props,
  className?: ClassName,
  variantKey?: TSlot,
) => string

type ResolveAriaFn = <P extends IntrinsicProps>(tag: ElementType, props: P) => { props: P }

/* ---------------------------------- */
/* Runtime API                        */
/* ---------------------------------- */

// Present only when a plugin was supplied; absent entirely on plugin-less runtimes.
type RuntimePluginField<TPlugin extends ClassPlugin | undefined> = TPlugin extends ClassPlugin
  ? { readonly classPlugin: TPlugin }
  : Record<never, never>

export type PolymorphicRuntime<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends VariantMap,
  TSlot extends string = never,
  TPreset extends Readonly<Record<string, Partial<VariantProps<Variants>>>> = Readonly<
    Record<string, Partial<VariantProps<Variants>>>
  >,
  TPlugin extends ClassPlugin | undefined = ClassPlugin | undefined,
> = RuntimePluginField<TPlugin> & {
  /**
   * Normalized, read-only factory configuration.
   * Single source of truth for runtime behavior.
   */
  readonly options: Readonly<ResolvedFactoryOptions<TDefault, Props, Variants, TPreset>>

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
  readonly resolveClasses: ResolveClassNameFn<Props, TSlot>

  /**
   * Validates aria-* attributes against the element's effective ARIA role.
   * Strips invalid attributes from the returned props and reports violations
   * through the factory's strict-mode setting.
   */
  readonly resolveAria: ResolveAriaFn
}
