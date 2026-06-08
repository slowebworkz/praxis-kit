import { E as ElementType, A as AnyRecord, _ as VariantMap, L as PresetMap, z as EmptyRecord, F as FactoryOptions, u as ClassPipelineOptions, s as ClassPipelineFn, V as StrictMode, j as AriaRule, I as IntrinsicProps, P as PolymorphicRuntime } from './class-pipeline-Dyec_2WT.js';
export { i as AriaRole, r as ClassName, D as DefaultProps, H as IntrinsicTag, K as KNOWN_ARIA_ROLES, J as KnownAriaRole, Q as PropsWithRole, S as ResolveTagFn, a2 as assertNever, a3 as cn, a4 as hasRole, a5 as isKnownAriaRole, a6 as makeResolveTag, a7 as mergeProps, a8 as resolveTag } from './class-pipeline-Dyec_2WT.js';
import 'clsx';
import 'type-fest';

type AriaEngine = {
    validate: (tag: ElementType, props: IntrinsicProps) => {
        props: IntrinsicProps;
    };
};
type Capabilities = {
    readonly createClassPipeline?: <TVariants extends VariantMap>(opts: ClassPipelineOptions<TVariants>) => ClassPipelineFn;
    readonly AriaEngine?: new (strict?: StrictMode, options?: {
        rules?: readonly AriaRule[];
    }) => AriaEngine;
};
declare function createPolymorphic<TDefault extends ElementType, Props extends AnyRecord, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>>(options?: FactoryOptions<TDefault, Props, Variants, TPreset>, capabilities?: Capabilities): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset>;

export { AnyRecord, ElementType, IntrinsicProps, createPolymorphic };
