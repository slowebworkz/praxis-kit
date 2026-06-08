import { StrictBase, StrictMode, ChildrenEvaluator, EmptyRecord, ElementType, VariantMap, PresetMap, AnyRecord, FactoryOptions, PolymorphicGenerics, createPolymorphic } from '@praxis-ui/core';

declare class SlotValidator extends StrictBase {
    #private;
    constructor(name: string, strict: StrictMode, elementTerm: string);
    assertExclusive(): void;
    warnDiscardedChildren(count: number): void;
    assertSingleChild(count: number): void;
}

type WithChildRules = {
    enforcement?: {
        children?: readonly unknown[];
    };
};

type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean;

type BuiltChildrenEvaluator<TOptions extends WithChildRules> = TOptions extends {
    enforcement: {
        children: readonly unknown[];
    };
} ? {
    childrenEvaluator: ChildrenEvaluator;
} : EmptyRecord;

type UnknownProps = Record<string, unknown>;

type SvelteFactoryOptions<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
    /**
     * Return true for any prop key that should be consumed but not forwarded to the DOM.
     * Receives `runtime.options.variantKeys` as a convenience if needed.
     */
    filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean;
};

type TypedRuntime<G extends PolymorphicGenerics> = ReturnType<typeof createPolymorphic<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>>;

type BuiltRuntime<G extends PolymorphicGenerics = PolymorphicGenerics, TOptions extends WithChildRules = WithChildRules> = BuiltChildrenEvaluator<TOptions> & {
    runtime: TypedRuntime<G>;
    filterProps: FilterPredicate;
    slotValidator: SlotValidator;
};

declare function createContractComponent<TDefault extends ElementType, Props extends UnknownProps = EmptyRecord, Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord, TOptions extends WithChildRules = SvelteFactoryOptions<TDefault, Props & TPluginProps, Variants, TPreset>>(options: SvelteFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & TOptions): BuiltRuntime<PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>, TOptions>;

export { type BuiltRuntime, type FilterPredicate, type SvelteFactoryOptions, type UnknownProps, type WithChildRules, createContractComponent };
