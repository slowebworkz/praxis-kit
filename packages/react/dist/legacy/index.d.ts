import { ElementType, VariantMap, PresetMap, EmptyRecord, AnyRecord, PolymorphicGenerics } from '@praxis-ui/core';
import { U as UnknownProps, R as ReactFactoryOptions, P as PolymorphicComponent } from '../merge-refs-DCT1MRGj.js';
export { E as ElementRef, a as PolymorphicProps, b as PolymorphicWithAsChild, c as PolymorphicWithRender, d as RenderCallbackProps, S as Slottable, e as SlottableProps, m as mergeRefs } from '../merge-refs-DCT1MRGj.js';
import * as react from 'react';
import 'type-fest';

declare function createAriaEnforcedComponent<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

declare function createChildrenEnforcedComponent<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

declare function createContractComponent<TDefault extends ElementType, Props extends UnknownProps = EmptyRecord, Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

declare function createContractedComponent<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

declare function createPolymorphicComponent<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>): PolymorphicComponent<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>>;

type SlotProps = {
    [key: string]: unknown;
};
declare const Slot: react.ForwardRefExoticComponent<Omit<SlotProps, "ref"> & react.RefAttributes<unknown>>;

export { PolymorphicComponent, ReactFactoryOptions, Slot, createAriaEnforcedComponent, createChildrenEnforcedComponent, createContractComponent, createContractedComponent, createPolymorphicComponent };
