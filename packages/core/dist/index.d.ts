import { E as ElementType, A as AnyRecord, _ as VariantMap, L as PresetMap, z as EmptyRecord, o as ChildRuleInput, T as ResolvedFactoryOptions, F as FactoryOptions, P as PolymorphicRuntime } from './class-pipeline-Dyec_2WT.js';
export { a as AriaContext, b as AriaFix, c as AriaFixResult, g as AriaPhase, h as AriaResult, i as AriaRole, j as AriaRule, C as CVACompounds, k as CVADefaults, l as CVAVariants, m as Cardinality, n as CardinalityInput, p as ChildRuleMatch, q as ChildRulePosition, r as ClassName, s as ClassPipelineFn, u as ClassPipelineOptions, v as ClassPlugin, w as ClassPluginFactory, x as CompoundVariant, D as DefaultProps, y as DefaultVariants, B as EnforcementOptions, G as FixKind, I as IntrinsicProps, H as IntrinsicTag, d as InvalidResult, e as InvalidWithFix, f as InvalidWithoutFix, K as KNOWN_ARIA_ROLES, J as KnownAriaRole, N as NonEmptyArray, O as OwnedPropKeys, Q as PropsWithRole, R as RemoveAttributeFixKind, S as ResolveTagFn, U as Severity, V as StrictMode, X as StylingOptions, Z as ValidResult, $ as VariantProps, a0 as VariantSelection, a1 as VariantValue, a2 as assertNever, a3 as cn, a4 as hasRole, a5 as isKnownAriaRole, a6 as makeResolveTag, a7 as mergeProps, a8 as resolveTag } from './class-pipeline-Dyec_2WT.js';
import { d as ValidationViolation } from './resolver-CayK2Owm.js';
export { A as AriaPolicyEngine, C as ChildrenEvaluator, E as EvaluationContext, M as MatchMatrix, N as NormalizationResult, a as NormalizedChildRule, R as ResolveInput, b as ResolveOutput, c as ResolverOptions, S as StrictBase, V as ValidationResult, e as colgroupContract, f as createResolverPipeline, g as detailsContract, h as dlContract, i as fieldsetContract, j as figureContract, k as getImplicitRole, l as htmlContracts, m as isAriaAttributeValidForRole, n as isGlobalAriaAttribute, o as isInvalid, p as isStandaloneTag, q as isStrongImplicitRole, r as listContract, s as optgroupContract, t as pictureContract, u as selectContract, v as tableBodyContract, w as tableContract, x as tableRowContract } from './resolver-CayK2Owm.js';
import { a as ClassDiagnosis } from './diagnose-class-pipeline-DJu8INPX.js';
export { C as CVAConfig, c as createClassPipeline } from './diagnose-class-pipeline-DJu8INPX.js';
import 'clsx';
import 'type-fest';

type ChildViolationKind = 'cardinality-min' | 'cardinality-max' | 'position' | 'unexpected' | 'ambiguous';
type ChildViolation = {
    kind: ChildViolationKind;
    message: string;
    /** Present for cardinality and position violations. */
    ruleName?: string;
    /** Present for unexpected and ambiguous violations. */
    childIndex?: number;
};

interface PolymorphicGenerics<TDefault extends ElementType = ElementType, Props extends AnyRecord = AnyRecord, Variants extends Readonly<VariantMap> = Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>> {
    default: TDefault;
    props: Props;
    variants: Variants;
    preset: TPreset;
}
type VariantsOf<T extends PolymorphicGenerics> = T['variants'];
type PresetOf<T extends PolymorphicGenerics> = T['preset'];

type DefaultOf<T extends PolymorphicGenerics> = T['default'];
type PropsOf<T extends PolymorphicGenerics> = T['props'];

declare function diagnoseChildren(rules: readonly ChildRuleInput[], children: unknown[], context?: string): ChildViolation[];

type ComponentDiagnosis = {
    classes: ClassDiagnosis;
    aria: ReadonlyArray<ValidationViolation>;
    children: ReadonlyArray<ChildViolation>;
};
declare function diagnose(options: ResolvedFactoryOptions, tag: ElementType, props: AnyRecord, children?: unknown[], className?: string, variantKey?: string): ComponentDiagnosis;

declare function createPolymorphic<TDefault extends ElementType, Props extends AnyRecord, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>>(options?: FactoryOptions<TDefault, Props, Variants, TPreset>): PolymorphicRuntime<TDefault, Props, Variants, Extract<keyof TPreset, string>, TPreset>;

export { AnyRecord, ChildRuleInput, type ChildViolation, type ChildViolationKind, type ComponentDiagnosis, type DefaultOf, ElementType, EmptyRecord, FactoryOptions, type PolymorphicGenerics, PolymorphicRuntime, PresetMap, type PresetOf, type PropsOf, ResolvedFactoryOptions, ValidationViolation, VariantMap, type VariantsOf, createPolymorphic, diagnose, diagnoseChildren };
