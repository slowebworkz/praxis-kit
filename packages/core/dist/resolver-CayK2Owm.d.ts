import { Merge, Simplify } from 'type-fest';
import { o as ChildRuleInput, m as Cardinality, q as ChildRulePosition, Z as ValidResult, A as AnyRecord, E as ElementType, r as ClassName, V as StrictMode, H as IntrinsicTag, a as AriaContext, B as EnforcementOptions, j as AriaRule, I as IntrinsicProps, s as ClassPipelineFn } from './class-pipeline-Dyec_2WT.js';

type NormalizedChildRule<T = unknown, U extends T = T> = Readonly<Merge<ChildRuleInput<T, U>, {
    cardinality: Cardinality;
    position: ChildRulePosition;
}>>;

type Severity = 'error' | 'warning' | (string & {});

type InvalidBase<M extends string = string> = {
    valid: false;
    severity: Severity;
    message: M;
    attribute?: string;
};
type InvalidWithFix<M extends string = string> = Simplify<InvalidBase<M> & {
    fixable: true;
}>;
type InvalidWithoutFix<M extends string = string> = Simplify<InvalidBase<M> & {
    fixable: false;
}>;
type InvalidResult<M extends string = string> = InvalidWithFix<M> | InvalidWithoutFix<M>;

type ValidationViolation = {
    message: string;
    tag: string;
    role: string | undefined;
    attribute: string | undefined;
    severity: Severity;
    phase: 'evaluate' | 'fix';
};

type ValidationResult = {
    props: Record<string, unknown>;
    violations: ReadonlyArray<ValidationViolation>;
};

/** Internal matching layer — not part of the public API surface. */
type MatchMatrix = Readonly<{
    childToRules: Readonly<{
        forward: ReadonlyMap<number, ReadonlySet<number>>;
        reverse: ReadonlyMap<number, ReadonlySet<number>>;
    }>;
}>;

declare function isGlobalAriaAttribute(attr: string): boolean;
declare function isAriaAttributeValidForRole(attr: string, role: string | undefined): boolean;

declare function isStrongImplicitRole(tag: string): boolean;
declare function isStandaloneTag(tag: string): boolean;

type AriaResult = ValidResult | InvalidResult;
declare function isInvalid(result: AriaResult): result is InvalidResult;

/**
 * The configuration passed to `createResolverPipeline`.
 *
 * A structural subset of `ResolvedFactoryOptions` — only the fields the
 * resolver pipeline needs directly. Keeping this narrow lets the function
 * accept any compatible options shape without pulling in the full generic.
 */
type ResolverOptions = {
    defaultTag: ElementType;
    defaultProps?: AnyRecord;
    strict?: StrictMode;
};
/**
 * The raw input to a resolver pipeline.
 *
 * All fields except `props` are optional — the pipeline fills in defaults
 * (`as` falls back to `defaultTag`, `className` defaults to the computed
 * class string, `children` passes through as-is).
 */
type ResolveInput<Props extends AnyRecord = AnyRecord, TSlot extends string = string, Children = unknown> = {
    /** Polymorphic element override. Falls back to the factory's `defaultTag`. */
    as?: ElementType;
    props: Props;
    className?: ClassName;
    /**
     * Selects a named preset from `presetMap`, applied before prop-level variants.
     * @remarks Planned rename to `recipe` (paired with `presets` → `recipes`). Not yet shipped.
     */
    variantKey?: TSlot;
    children?: Children;
};
/**
 * The fully resolved output of a resolver pipeline.
 *
 * Every field is concrete — no optionals. Framework adapters consume this
 * shape to render the final element.
 */
type ResolveOutput<Props extends AnyRecord = AnyRecord, Children = unknown> = {
    tag: ElementType;
    props: Props;
    className: ClassName;
    children?: Children;
};

type NormalizationResult = {
    normalized: false;
} | {
    normalized: true;
    result: ValidationResult;
};
type EvaluationContext = {
    proceed: false;
    result: ValidationResult;
} | {
    proceed: true;
    tag: IntrinsicTag;
    implicitRole: string;
    effectiveRole: string;
    context: AriaContext;
};

/**
 * `<ul>` and `<ol>` — direct children must be `<li>`, `<script>`, or `<template>`.
 */
declare const listContract: EnforcementOptions;
/**
 * `<table>` — valid direct children per HTML5 content model.
 * `<caption>` is optional and must be first; `<thead>` and `<tfoot>` are at most one each.
 */
declare const tableContract: EnforcementOptions;
/**
 * `<thead>`, `<tbody>`, and `<tfoot>` — direct children must be `<tr>`, `<script>`,
 * or `<template>`.
 */
declare const tableBodyContract: EnforcementOptions;
/**
 * `<tr>` — direct children must be `<td>`, `<th>`, `<script>`, or `<template>`.
 */
declare const tableRowContract: EnforcementOptions;
/**
 * `<colgroup>` — direct children must be `<col>` or `<template>`.
 */
declare const colgroupContract: EnforcementOptions;
/**
 * `<dl>` — direct children must be `<dt>`, `<dd>`, `<div>` (as group wrapper),
 * `<script>`, or `<template>`.
 */
declare const dlContract: EnforcementOptions;
/**
 * `<select>` — direct children must be `<option>`, `<optgroup>`, `<hr>`, `<script>`,
 * or `<template>`.
 */
declare const selectContract: EnforcementOptions;
/**
 * `<optgroup>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
declare const optgroupContract: EnforcementOptions;
/**
 * `<picture>` — any number of `<source>` elements followed by exactly one `<img>`.
 */
declare const pictureContract: EnforcementOptions;
/**
 * `<figure>` — at most one `<figcaption>` (first or last); any other flow content
 * is permitted. The `content` rule acts as an open catch-all so non-figcaption
 * children — including component children — are not flagged as unexpected.
 */
declare const figureContract: EnforcementOptions;
/**
 * `<details>` — at most one `<summary>` and it must be the first child; any other
 * flow content is permitted.
 */
declare const detailsContract: EnforcementOptions;
/**
 * `<fieldset>` — at most one `<legend>` and it must be the first child; any other
 * flow content is permitted.
 */
declare const fieldsetContract: EnforcementOptions;
/**
 * Ready-made `EnforcementOptions` objects keyed by HTML element tag name.
 *
 * Pass directly to `createContractComponent`:
 * ```ts
 * const List = createContractComponent({ tag: 'ul', enforcement: htmlContracts.ul })
 * ```
 *
 * All contracts default to `strict: 'warn'`. Override with a spread to change severity:
 * ```ts
 * enforcement: { ...htmlContracts.ul, strict: 'throw' }
 * ```
 */
declare const htmlContracts: Record<string, EnforcementOptions>;

declare const IMPLICIT_ROLE_RECORD: {
    readonly article: "article";
    readonly aside: "complementary";
    readonly footer: "contentinfo";
    readonly header: "banner";
    readonly main: "main";
    readonly nav: "navigation";
    readonly button: "button";
    readonly a: "link";
    readonly select: "listbox";
    readonly h1: "heading";
    readonly h2: "heading";
    readonly h3: "heading";
    readonly h4: "heading";
    readonly h5: "heading";
    readonly h6: "heading";
    readonly ul: "list";
    readonly ol: "list";
    readonly li: "listitem";
    readonly table: "table";
    readonly tr: "row";
    readonly td: "cell";
    readonly th: "columnheader";
};
type ImplicitRoleMap = typeof IMPLICIT_ROLE_RECORD;
type Tag = keyof ImplicitRoleMap;
type Role = ImplicitRoleMap[Tag];
declare function getImplicitRole(tag: IntrinsicTag): Role | undefined;

declare abstract class StrictBase {
    protected readonly strict: StrictMode;
    constructor(strict: StrictMode);
    protected violate(message: string): void;
    protected warn(message: string): void;
    protected invariant(condition: unknown, message: string): void;
}

type AnyTag = ElementType | ((...args: unknown[]) => unknown);
declare class AriaPolicyEngine extends StrictBase {
    #private;
    constructor(strict?: StrictMode, options?: {
        rules?: readonly AriaRule[];
    });
    static evaluate(tag: AnyTag, props: IntrinsicProps): ValidationResult;
    report(violations: ReadonlyArray<ValidationViolation>): void;
    validate(tag: AnyTag, props: IntrinsicProps): ValidationResult;
}

declare class ChildrenEvaluator extends StrictBase {
    #private;
    constructor(rules: readonly ChildRuleInput[], strict?: StrictMode, context?: string);
    evaluate(children: unknown[]): void;
}

declare function createResolverPipeline<Props extends AnyRecord, TSlot extends string = string, Children = unknown>(resolved: ResolverOptions, classPipeline: ClassPipelineFn): (input: ResolveInput<Props, TSlot, Children>) => ResolveOutput<Props, Children>;

export { AriaPolicyEngine as A, ChildrenEvaluator as C, type EvaluationContext as E, type MatchMatrix as M, type NormalizationResult as N, type ResolveInput as R, StrictBase as S, type ValidationResult as V, type NormalizedChildRule as a, type ResolveOutput as b, type ResolverOptions as c, type ValidationViolation as d, colgroupContract as e, createResolverPipeline as f, detailsContract as g, dlContract as h, fieldsetContract as i, figureContract as j, getImplicitRole as k, htmlContracts as l, isAriaAttributeValidForRole as m, isGlobalAriaAttribute as n, isInvalid as o, isStandaloneTag as p, isStrongImplicitRole as q, listContract as r, optgroupContract as s, pictureContract as t, selectContract as u, tableBodyContract as v, tableContract as w, tableRowContract as x };
