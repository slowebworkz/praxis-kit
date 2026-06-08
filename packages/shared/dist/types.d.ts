import { A as AnyRecord } from './any-record-CarbE-Qh.js';
import { A as AriaRole, I as IntrinsicProps } from './props-with-role-C9Qj1cmA.js';
export { P as PropsWithRole } from './props-with-role-C9Qj1cmA.js';
export { b as KnownAriaRole } from './known-aria-roles-BIF1I0MH.js';
import { ClassName, TagMap } from './types/primitives.js';
export { DefaultProps } from './types/primitives.js';
import { a as EmptyRecord, I as IntrinsicTag, E as ElementType } from './non-empty-array-lxV9SYLA.js';
export { N as NonEmptyArray } from './non-empty-array-lxV9SYLA.js';
export { Capabilities } from './types/capabilities.js';
import { StrictMode } from './types/config.js';
import { b as ChildRuleInput } from './with-child-rules-tCt4__v0.js';
export { C as Cardinality, a as CardinalityInput, c as ChildRuleMatch, d as ChildRulePosition, N as NormalizedChildRule, W as WithChildRules } from './with-child-rules-tCt4__v0.js';
export { ChildViolation, ChildViolationKind } from './types/contracts.js';
import { V as ValidResult } from './valid-result-CSOzaXJz.js';
export { I as InvalidResult, a as InvalidWithFix, b as InvalidWithoutFix } from './valid-result-CSOzaXJz.js';
export { V as ValidationResult, a as ValidationViolation } from './validation-result-DW5Foqkw.js';
import { PresetTarget, CVAVariants, CVADefaults, CVACompounds, VariantProps, CompoundVariant } from './types/variants.js';
export { CVAConfig, DefaultVariants, PolymorphicGenerics, PresetOf, StringToBoolean, VariantKey, VariantsOf } from './types/variants.js';
import { a as VariantMap, P as PresetMap, b as VariantSelection } from './variant-condition-value-CY9Vvx44.js';
export { V as VariantConditionValue, c as VariantStates, d as VariantValue } from './variant-condition-value-CY9Vvx44.js';
import { Simplify, ReadonlyDeep } from 'type-fest';
import './severity-D5t9u4XZ.js';

interface BaseClassOptions {
    baseClassName?: ClassName;
}

type ClassPipelineFn = (tag: unknown, props: AnyRecord, className?: ClassName, variantKey?: string) => string;

interface PresetOptions<TVariants extends VariantMap = VariantMap> {
    presetMap?: Record<string, PresetTarget<TVariants>>;
}

interface TagMapOptions {
    tagMap?: TagMap;
}

type CompositionOptions<TVariants extends VariantMap = VariantMap> = Simplify<TagMapOptions & PresetOptions<TVariants>>;

type CVASystemOptions<TVariants extends VariantMap = VariantMap> = Simplify<CVAVariants<TVariants> & CVADefaults<TVariants> & CVACompounds<TVariants>>;

type StyleOptions<TVariants extends VariantMap = VariantMap> = Simplify<BaseClassOptions & CVASystemOptions<TVariants>>;

type ClassPipelineOptions<TVariants extends VariantMap = VariantMap> = Simplify<StyleOptions<TVariants> & CompositionOptions<TVariants>>;

type OwnedPropKeys = ReadonlySet<string>;

type ClassPlugin<TProps extends AnyRecord = EmptyRecord> = Readonly<{
    pipeline: ClassPipelineFn;
    ownedKeys?: OwnedPropKeys;
    readonly _pluginProps?: TProps;
}>;

type ClassPluginFactory<TProps extends AnyRecord = EmptyRecord> = <V extends VariantMap>(options: ClassPipelineOptions<V>, strict: StrictMode) => ClassPlugin<TProps>;

type AriaContext = {
    readonly tag: IntrinsicTag;
    readonly implicitRole: AriaRole | undefined;
    readonly effectiveRole: string | undefined;
    readonly props: ReadonlyDeep<IntrinsicProps>;
};

type RemoveAttributeFixKind = `removeAttribute:${string}`;
type InjectLiveFixKind = `injectLive:${string}`;
type FixKind = 'removeRole' | 'setRole' | 'normalizeRelevantAll' | RemoveAttributeFixKind | InjectLiveFixKind;

type AriaFixResult = {
    applied: false;
    next: ReadonlyDeep<IntrinsicProps>;
} | {
    applied: true;
    next: ReadonlyDeep<IntrinsicProps>;
    previous: ReadonlyDeep<IntrinsicProps>;
};
type AriaFix = {
    readonly kind: FixKind;
    readonly priority?: number;
    readonly source?: string;
    readonly apply: (context: AriaContext) => AriaFixResult;
};

type Severity = 'error' | 'warning' | (string & {});

type AriaInvalidBase<M extends string = string> = {
    valid: false;
    severity: Severity;
    message: M;
    attribute?: string;
};
type AriaInvalidWithFix<M extends string = string> = AriaInvalidBase<M> & {
    fixable: true;
    fix: AriaFix;
};
type AriaInvalidWithoutFix<M extends string = string> = AriaInvalidBase<M> & {
    fixable: false;
};
type AriaInvalidResult<M extends string = string> = AriaInvalidWithFix<M> | AriaInvalidWithoutFix<M>;
type AriaResult = ValidResult | AriaInvalidResult;
type AriaPhase = 'evaluate' | 'fix';

type AriaRule<C extends AriaContext = AriaContext> = (context: C) => readonly AriaResult[];

type EnforcementOptions = {
    readonly strict?: StrictMode;
    readonly aria?: readonly AriaRule[];
    readonly children?: readonly ChildRuleInput[];
};

type StylingOptions<V extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<V> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = {
    readonly base?: ClassName;
    readonly variants?: V;
    readonly defaults?: Partial<VariantProps<V>>;
    readonly compounds?: readonly CompoundVariant<V>[];
    readonly presets?: TPreset;
    readonly tags?: Readonly<TagMap>;
    readonly plugin?: ClassPluginFactory<TPluginProps>;
    readonly precomputedClasses?: Readonly<Record<string, string>>;
};

type FactoryOptions<TDefault extends ElementType = ElementType, Props extends AnyRecord = EmptyRecord, V extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<V> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = {
    readonly tag?: TDefault;
    readonly name?: string;
    readonly defaults?: Partial<NoInfer<Props>>;
    readonly styling?: StylingOptions<V, TPreset, TPluginProps>;
    readonly enforcement?: EnforcementOptions;
};

type ResolvedFactoryOptions<TDefault extends ElementType = ElementType, Props extends AnyRecord = EmptyRecord, V extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<V> = Readonly<EmptyRecord>> = {
    readonly defaultTag: TDefault;
    readonly baseClassName?: ClassName;
    readonly defaultProps?: Partial<Props>;
    readonly tagMap?: Readonly<TagMap>;
    readonly presetMap?: TPreset;
    readonly variants?: V;
    readonly defaultVariants?: Partial<VariantProps<V>>;
    readonly compoundVariants?: readonly CompoundVariant<V>[];
    readonly displayName?: string;
    readonly strict: StrictMode;
    readonly variantKeys: ReadonlySet<string>;
    readonly childRules?: readonly ChildRuleInput[];
    readonly ariaRules?: readonly AriaRule[];
    readonly precomputedClasses?: Readonly<Record<string, string>>;
};

type ResolveAriaFn = <P extends IntrinsicProps>(tag: ElementType, props: P) => {
    props: P;
};

type ResolveClassNameFn<Props extends AnyRecord, TSlot extends string = never> = (tag: ElementType, props: Props, className?: ClassName, variantKey?: TSlot) => string;

type ResolvePropsFn<Props extends AnyRecord> = <P extends Partial<Props>>(props: P) => Simplify<Omit<Props, keyof P> & P>;

type ResolveTagFn<TDefault extends ElementType> = <T extends ElementType | undefined = undefined>(as?: T) => T extends ElementType ? T : TDefault;

type RuntimePluginField<TPlugin extends ClassPlugin | undefined> = TPlugin extends ClassPlugin ? {
    readonly classPlugin: TPlugin;
    readonly hasStyling: true;
} : EmptyRecord;

type PolymorphicRuntime<TDefault extends ElementType, Props extends AnyRecord, Variants extends VariantMap, TSlot extends string = never, TPreset extends PresetMap<Variants> = Readonly<Record<string, VariantSelection<Variants>>>, TPlugin extends ClassPlugin | undefined = ClassPlugin | undefined> = RuntimePluginField<TPlugin> & {
    readonly options: Readonly<ResolvedFactoryOptions<TDefault, Props, Variants, TPreset>>;
    readonly resolveTag: ResolveTagFn<TDefault>;
    readonly resolveProps: ResolvePropsFn<Props>;
    readonly resolveClasses: ResolveClassNameFn<Props, TSlot>;
    readonly resolveAria: ResolveAriaFn;
};

export { AnyRecord, type AriaContext, type AriaFix, type AriaFixResult, type AriaInvalidResult, type AriaInvalidWithFix, type AriaInvalidWithoutFix, type AriaPhase, type AriaResult, AriaRole, type AriaRule, type BaseClassOptions, CVACompounds, CVADefaults, type CVASystemOptions, CVAVariants, ChildRuleInput, ClassName, type ClassPipelineFn, type ClassPipelineOptions, type ClassPlugin, type ClassPluginFactory, type CompositionOptions, CompoundVariant, ElementType, EmptyRecord, type EnforcementOptions, type FactoryOptions, type FixKind, IntrinsicProps, IntrinsicTag, type OwnedPropKeys, type PolymorphicRuntime, PresetMap, type PresetOptions, PresetTarget, type RemoveAttributeFixKind, type ResolveAriaFn, type ResolveClassNameFn, type ResolvePropsFn, type ResolveTagFn, type ResolvedFactoryOptions, type RuntimePluginField, type Severity, StrictMode, type StyleOptions, type StylingOptions, TagMap, type TagMapOptions, ValidResult, VariantMap, VariantProps, VariantSelection };
