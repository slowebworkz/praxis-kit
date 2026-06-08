import { _ as VariantMap, l as CVAVariants, k as CVADefaults, C as CVACompounds, W as StyleOptions, Y as TagMapOptions, M as PresetOptions, t as ClassPipelineFn, A as AnyRecord } from './class-pipeline-Dyec_2WT.js';

type CVAConfig<V extends VariantMap> = CVAVariants<V> & CVADefaults<V> & CVACompounds<V>;

type VariantConditionValue = string | boolean | ReadonlyArray<string | boolean>;

interface PrecomputedClassesOptions {
    /** Static variant-class map injected by `classExtractPlugin`. Keys use the same format as `VariantClassResolver` cache keys (variant-only props, sorted). */
    precomputedClasses?: Readonly<Record<string, string>>;
}
type CompositionOptions<TVariants extends VariantMap = VariantMap> = TagMapOptions & PresetOptions<TVariants> & PrecomputedClassesOptions;
type ClassPipelineOptions<TVariants extends VariantMap = VariantMap> = StyleOptions<TVariants> & CompositionOptions<TVariants>;

declare function createClassPipeline<TVariants extends VariantMap = VariantMap>(resolved: ClassPipelineOptions<TVariants>): ClassPipelineFn;

type CompoundTrace = {
    conditions: Record<string, VariantConditionValue>;
    class: string | string[];
    fired: boolean;
    mismatches: Array<{
        key: string;
        expected: VariantConditionValue;
        got: unknown;
    }>;
};
type ClassDiagnosis = {
    base: string;
    tagMapClass: string | null;
    tagMapBypassed: boolean;
    presetKey: string | undefined;
    presetValues: AnyRecord | null;
    effectiveVariants: AnyRecord;
    compounds: CompoundTrace[];
    callerClass: string | undefined;
    final: string;
};
declare function diagnoseClassPipeline<TVariants extends VariantMap>(options: ClassPipelineOptions<TVariants>, tag: unknown, props: AnyRecord, className?: string, variantKey?: string): ClassDiagnosis;

export { type CVAConfig as C, type ClassDiagnosis as a, type CompoundTrace as b, createClassPipeline as c, diagnoseClassPipeline as d };
