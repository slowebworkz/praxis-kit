import { ElementType, VariantMap, PresetMap, EmptyRecord, AnyRecord, FactoryOptions, IntrinsicTag, PolymorphicGenerics, DefaultOf, PropsOf, VariantProps, VariantsOf, ClassName, PresetOf } from '@praxis-ui/core';
import { VNode, ComponentType, JSX, Ref, ComponentChildren } from 'preact';
import { Simplify, OmitIndexSignature } from 'type-fest';

type UnknownProps = Record<string, unknown>;
type SlotComponent = ComponentType<UnknownProps>;
type AnyVNode = VNode<any>;

type PreactFactoryOptions<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
    /** Component used to render the asChild slot. Defaults to the built-in Slot. */
    slotComponent?: SlotComponent;
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
    className?: ClassName | undefined;
    variantKey?: keyof PresetOf<G>;
    ref?: Ref<ElementRef<TAs>>;
};
type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<IntrinsicJSXProps<TAs>, keyof ControlProps<G, TAs> | 'children'> & ControlProps<G, TAs>;
type PolymorphicProps<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<SharedProps<G, TAs> & {
    asChild?: false;
    children?: unknown;
}>;
type PolymorphicWithAsChild<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<SharedProps<G, TAs> & {
    asChild: true;
    as?: never;
    children: AnyVNode | AnyVNode[];
}>;
type PolymorphicComponent<G extends PolymorphicGenerics> = {
    <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): AnyVNode;
    <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): AnyVNode;
    displayName?: string;
};

declare function createContractComponent<TDefault extends ElementType, Props extends UnknownProps = EmptyRecord, Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: PreactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

type SlottableProps = {
    children?: ComponentChildren;
};
declare function Slottable({ children }: SlottableProps): AnyVNode;

export { type ElementRef, type PolymorphicComponent, type PolymorphicProps, type PolymorphicWithAsChild, type PreactFactoryOptions, Slottable, createContractComponent };
