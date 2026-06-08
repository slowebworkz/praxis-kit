import { ElementType, VariantMap, PresetMap, EmptyRecord, AnyRecord, FactoryOptions, PolymorphicGenerics, DefaultOf, PropsOf, VariantProps, VariantsOf, ClassName, PresetOf } from '@praxis-ui/core';
import * as vue from 'vue';
import { AllowedComponentProps } from 'vue';
import { Simplify } from 'type-fest';

type UnknownProps = Record<string, unknown>;

type VueFactoryOptions<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
    /**
     * Return true for any prop key that should be consumed but not forwarded to
     * the DOM. Variant keys are always stripped automatically.
     */
    filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean;
};

type SlottableProps = {
    children?: unknown;
};
/**
 * Marker component for the Slottable sibling pattern. Wrap content that should
 * be passed as the asChild slot's children when additional siblings are present.
 */
declare const Slottable: vue.DefineComponent<{}, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, {}, string, vue.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;

type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = PropsOf<G> & VariantProps<VariantsOf<G>> & {
    as?: TAs;
    class?: ClassName;
    variantKey?: keyof PresetOf<G>;
};
/**
 * Props for the normal (non-slot) render path. `asChild` is absent or `false`.
 *
 * `AllowedComponentProps` adds Vue system props (`key`, `ref`, lifecycle hooks).
 * `UnknownProps` allows HTML attributes that aren't explicitly enumerated.
 */
type PolymorphicProps<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<ControlProps<G, TAs> & AllowedComponentProps & {
    asChild?: false;
} & UnknownProps>;
/**
 * Props for the slot render path (`asChild: true`). `as` is forbidden — combining
 * `as` with `asChild` is a runtime invariant violation, so it is rejected at the
 * type level too.
 */
type PolymorphicWithAsChild<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<ControlProps<G, TAs> & AllowedComponentProps & {
    asChild: true;
    as?: never;
} & UnknownProps>;
/**
 * A Vue polymorphic component typed for use in templates and JSX via the
 * `new()` instance-constructor pattern that Volar uses for prop checking.
 *
 * Unlike React's overloaded call signatures, Vue has no per-call-site generic
 * inference for `as`, so HTML attribute narrowing based on the `as` value is
 * not available — `UnknownProps` captures the open-ended attribute surface instead.
 */
type PolymorphicComponent<G extends PolymorphicGenerics> = {
    new (): {
        $props: PolymorphicProps<G> | PolymorphicWithAsChild<G>;
    };
    displayName?: string;
};

declare function createContractComponent<TDefault extends ElementType, Props extends UnknownProps = EmptyRecord, Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: VueFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

export { type PolymorphicComponent, type PolymorphicProps, type PolymorphicWithAsChild, Slottable, type SlottableProps, type VueFactoryOptions, createContractComponent };
