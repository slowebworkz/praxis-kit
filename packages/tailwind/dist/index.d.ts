import { VariantMap, ClassPipelineOptions, StrictMode, ClassPlugin } from '@praxis-ui/core';
import { Simplify } from 'type-fest';

declare const layoutKeys: readonly ["flex", "grid"];

type LayoutKey = (typeof layoutKeys)[number];
type LayoutMode = LayoutKey | 'none';
type ExclusiveTrueProp<K extends PropertyKey> = {
    [P in K]: Simplify<Record<P, true> & Partial<Record<Exclude<K, P>, never>>>;
}[K];
/**
 * Mutually exclusive layout shorthand props.
 *
 * At most one key may be `true`. Passing both is a compile-time error; the
 * runtime also warns and lets `flex` take precedence for graceful degradation.
 */
type LayoutProps = ExclusiveTrueProp<LayoutKey> | Partial<Record<LayoutKey, never>>;

declare function createTailwindPipeline<V extends VariantMap = VariantMap>(options: ClassPipelineOptions<V>, strict: StrictMode): ClassPlugin<LayoutProps>;

type ClassToken = string;
type Token<TKind extends string, TData extends object = Record<never, never>> = {
    kind: TKind;
    raw: string;
} & TData;
type LayoutToken = Token<'layout', {
    value: LayoutKey;
}>;
type ConditionalToken = Token<'conditional', {
    requires: LayoutKey;
}>;
type GapToken = Token<'gap'>;
type UtilityToken = Token<'utility', {
    base: string;
}>;
type ClassifiedToken = LayoutToken | ConditionalToken | GapToken | UtilityToken;

declare class ClassBuilder {
    #private;
    build(tokens: ClassifiedToken[]): string;
}

declare class ClassClassifier {
    #private;
    classify(token: ClassToken): ClassifiedToken;
}

type DependencyRules = Record<LayoutKey, readonly RegExp[]>;
declare const defaultDependencyRules: DependencyRules;

/**
 * The resolved layout mode for a single render.
 *
 * The mode is owned by the `flex`/`grid` props (resolved in `createTailwindPipeline`),
 * never inferred from class tokens — a `flex`/`grid` class appearing in the resolved
 * class string is a reserved-literal authoring mistake, not a mode source. Defaults to
 * `'none'` when neither prop is set.
 */
declare class LayoutState {
    #private;
    constructor(mode: LayoutMode);
    get mode(): LayoutMode;
}

declare class DependencyEvaluator {
    private readonly rules;
    constructor(rules: DependencyRules);
    evaluate(token: ClassifiedToken, state: LayoutState): boolean;
}

export { ClassBuilder, ClassClassifier, type ClassToken, type ClassifiedToken, type ConditionalToken, DependencyEvaluator, type DependencyRules, type GapToken, type LayoutKey, type LayoutMode, type LayoutProps, LayoutState, type LayoutToken, type UtilityToken, createTailwindPipeline, defaultDependencyRules };
