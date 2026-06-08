import { ElementType, VariantMap, PresetMap, EmptyRecord, AnyRecord, FactoryOptions, IntrinsicTag, PolymorphicGenerics, DefaultOf, PropsOf, VariantProps, VariantsOf, ClassName, PresetOf } from '@praxis-ui/core';
import { JSX } from 'solid-js';
import { Simplify, OmitIndexSignature } from 'type-fest';

type UnknownProps = Record<string, unknown>;
type SolidElement = JSX.Element;
type SlotRenderFn = (props: UnknownProps) => SolidElement;

type SolidFactoryOptions<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
    /**
     * Return true for any prop key that should be consumed but not forwarded to the DOM.
     * Receives `runtime.options.variantKeys` as a convenience if needed.
     */
    filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean;
};

type ElementRef<T extends ElementType> = T extends IntrinsicTag ? HTMLElementTagNameMap[T] : unknown;
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag ? JSX.IntrinsicElements[T] : UnknownProps;
type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OmitIndexSignature<PropsOf<G>> & OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: TAs;
    class?: ClassName | undefined;
    variantKey?: keyof PresetOf<G>;
    ref?: (el: ElementRef<TAs>) => void;
};
type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<IntrinsicJSXProps<TAs>, keyof ControlProps<G, TAs> | 'children' | 'ref'> & ControlProps<G, TAs>;
type AsChildProps<G extends PolymorphicGenerics> = Partial<OmitIndexSignature<PropsOf<G>>> & OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: never;
    asChild: true;
    children: SlotRenderFn;
    class?: ClassName | undefined;
    variantKey?: keyof PresetOf<G>;
    ref?: unknown;
};
type PolymorphicProps<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<(SharedProps<G, TAs> & {
    asChild?: false;
    children?: unknown;
}) | AsChildProps<G>>;
type PolymorphicComponent<G extends PolymorphicGenerics> = {
    <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): JSX.Element;
    displayName?: string;
};

declare function createContractComponent<TDefault extends ElementType, Props extends UnknownProps = EmptyRecord, Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: SolidFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

export { type ElementRef, type PolymorphicComponent, type PolymorphicProps, type SolidFactoryOptions, createContractComponent };
