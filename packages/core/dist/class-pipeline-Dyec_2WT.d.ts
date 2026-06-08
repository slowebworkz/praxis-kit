import { ClassValue } from 'clsx';
import { RequireAtLeastOne, Simplify, ReadonlyDeep } from 'type-fest';

type AnyRecord$1 = Record<string, unknown>;
type IntrinsicTag$1 = keyof HTMLElementTagNameMap;
type ElementType$1 = IntrinsicTag$1 | (string & {});

type ResolveTagFn$1<TDefault extends ElementType$1> = <T extends ElementType$1 | undefined = undefined>(as?: T) => T extends ElementType$1 ? T : TDefault;
declare function resolveTag<TDefault, TAs>(defaultTag: TDefault, as?: TAs): TDefault | NonNullable<TAs>;
declare function makeResolveTag<TDefault extends ElementType$1>(defaultTag: TDefault): ResolveTagFn$1<TDefault>;

declare function assertNever(value: never): never;

declare function cn(...inputs: ClassValue[]): string;

declare function mergeProps<T extends AnyRecord$1, P extends AnyRecord$1>(defaultProps: Partial<T> | undefined, props: P): Omit<Partial<T>, keyof P> & P;

type AnyRecord = Record<string, unknown>;

declare const KNOWN_ARIA_ROLES: readonly ["alert", "alertdialog", "application", "article", "banner", "blockquote", "button", "caption", "cell", "checkbox", "code", "columnheader", "combobox", "complementary", "contentinfo", "definition", "deletion", "dialog", "document", "emphasis", "feed", "figure", "form", "generic", "grid", "gridcell", "group", "heading", "img", "insertion", "link", "list", "listbox", "listitem", "log", "main", "marquee", "math", "menu", "menubar", "menuitem", "menuitemcheckbox", "menuitemradio", "meter", "navigation", "none", "note", "option", "paragraph", "presentation", "progressbar", "radio", "radiogroup", "region", "row", "rowgroup", "rowheader", "scrollbar", "search", "searchbox", "separator", "slider", "spinbutton", "status", "strong", "subscript", "superscript", "switch", "tab", "table", "tablist", "tabpanel", "term", "textbox", "time", "timer", "toolbar", "tooltip", "tree", "treegrid", "treeitem"];
type KnownAriaRole = (typeof KNOWN_ARIA_ROLES)[number];

type AriaRole$1 = KnownAriaRole | (string & {});

type ClassName = string;

type DefaultProps<T> = T extends AnyRecord ? Partial<T> : never;

type IntrinsicTag = keyof HTMLElementTagNameMap;

type ElementType = IntrinsicTag | (string & {});

type EmptyRecord = Record<never, never>;

type IntrinsicProps = AnyRecord & {
    role?: AriaRole$1;
};

type NonEmptyArray<T> = [T, ...T[]];

type PropsWithRole = Readonly<IntrinsicProps & {
    role: string;
}>;

type TagMap = Partial<Record<IntrinsicTag | (string & {}), ClassName>>;

type StrictMode = boolean | 'warn' | 'async-warn' | 'throw';

type CardinalityInput = {
    min?: number;
    max?: number;
};
/** Unboundedness is encoded in the type, not a sentinel value, enabling exhaustive switches. */
type Cardinality = {
    kind: 'bounded';
    min: number;
    max: number;
} | {
    kind: 'unbounded';
};

type ChildRuleMatch<T, U extends T = T> = (child: T) => child is U;

type ChildRulePosition = 'first' | 'last' | 'any';

type ChildRuleInput<T = unknown, U extends T = T> = {
    name: string;
    match: ChildRuleMatch<T, U>;
    cardinality?: CardinalityInput;
    position?: ChildRulePosition;
    /**
     * Optional component-type reference for O(1) dispatch index.
     * When provided for every rule, the matcher reads child.type instead of
     * calling every match function on every child (O(n×m) → O(n+m)).
     */
    type?: unknown;
};

type ValidResult = {
    valid: true;
};

type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T;

type VariantValue = string | string[];

type VariantStates<K extends string = string> = Record<K, VariantValue>;

type VariantMap<V extends string = string, K extends string = string> = Record<V, VariantStates<K>>;

type VariantKey<V extends VariantMap, K extends keyof V> = StringToBoolean<keyof V[K] & string>;

type RequireAtLeastOneIfNotEmpty<T> = keyof T extends never ? EmptyRecord : RequireAtLeastOne<T>;
type CompoundVariantConditionValue<V extends VariantMap, K extends keyof V> = VariantKey<V, K> | NonEmptyArray<VariantKey<V, K>>;
type CompoundVariantConditions<V extends VariantMap> = Simplify<{
    [K in keyof V]: CompoundVariantConditionValue<V, K>;
}>;
type CompoundVariantRequiredConditions<V extends VariantMap> = RequireAtLeastOneIfNotEmpty<CompoundVariantConditions<V>>;
type CompoundVariantBase<V extends VariantMap> = keyof V extends never ? EmptyRecord : CompoundVariantRequiredConditions<V>;
type CompoundVariant<V extends VariantMap> = CompoundVariantBase<V> & {
    class: VariantValue;
};

interface CVACompounds<V extends VariantMap> {
    compoundVariants?: readonly CompoundVariant<V>[];
}

/** The full optional prop surface exposed to callers for a given variant map. */
type VariantProps<V extends VariantMap> = {
    [K in keyof V]?: VariantKey<V, K>;
};
type DefaultVariants<V extends VariantMap> = {
    [K in keyof V]?: VariantKey<V, K>;
};

interface CVADefaults<V extends VariantMap> {
    defaultVariants?: DefaultVariants<V>;
}

interface CVAVariants<V extends VariantMap> {
    variants?: V;
}

/**
 * A partial selection of variant states authored at factory definition time.
 *
 * Uses `keyof V[K]` directly (not `VariantKey`) so TypeScript can eagerly
 * resolve the union at constraint-check time without deferred conditional types.
 */
type VariantSelection<V extends VariantMap> = {
    [K in keyof V]?: keyof V[K];
};

/**
 * A static, immutable map of named presets to partial variant selections.
 *
 * Presets are named bundles of variant props that callers activate by key,
 * avoiding the need to repeat variant combinations at each call site.
 */
type PresetMap<V extends VariantMap = VariantMap> = Readonly<Record<string, VariantSelection<V>>>;

type PresetTarget<TVariants extends VariantMap = VariantMap> = VariantSelection<TVariants>;

interface BaseClassOptions {
    baseClassName?: ClassName;
}

type ClassPipelineFn$1 = (tag: unknown, props: AnyRecord, className?: ClassName, variantKey?: string) => string;

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
    pipeline: ClassPipelineFn$1;
    ownedKeys?: OwnedPropKeys;
    readonly _pluginProps?: TProps;
}>;

type ClassPluginFactory<TProps extends AnyRecord = EmptyRecord> = <V extends VariantMap>(options: ClassPipelineOptions<V>, strict: StrictMode) => ClassPlugin<TProps>;

type AriaContext = {
    readonly tag: IntrinsicTag;
    readonly implicitRole: AriaRole$1 | undefined;
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

declare function hasRole(props: IntrinsicProps): props is PropsWithRole;

declare function isKnownAriaRole(value: unknown): value is KnownAriaRole;

type AriaRole = KnownAriaRole | (string & {});

/**
 * The resolved class-computation function produced by `createClassPipeline`.
 *
 * Accepts the rendered tag, the merged prop object, an optional caller-supplied
 * class override, and an optional preset key. Returns the final combined class
 * string — base class, tag-map class, variant class, and caller class merged.
 *
 * `variantKey` selects a named preset from `presetMap`, applying its variant
 * selections before any prop-level overrides.
 */
type ClassPipelineFn = (tag: unknown, props: AnyRecord, className?: ClassName, variantKey?: string) => string;

export { type VariantProps as $, type AnyRecord as A, type EnforcementOptions as B, type CVACompounds as C, type DefaultProps as D, type ElementType as E, type FactoryOptions as F, type FixKind as G, type IntrinsicTag as H, type IntrinsicProps as I, type KnownAriaRole as J, KNOWN_ARIA_ROLES as K, type PresetMap as L, type PresetOptions as M, type NonEmptyArray as N, type OwnedPropKeys as O, type PolymorphicRuntime as P, type PropsWithRole as Q, type RemoveAttributeFixKind as R, type ResolveTagFn as S, type ResolvedFactoryOptions as T, type Severity as U, type StrictMode as V, type StyleOptions as W, type StylingOptions as X, type TagMapOptions as Y, type ValidResult as Z, type VariantMap as _, type AriaContext as a, type VariantSelection as a0, type VariantValue as a1, assertNever as a2, cn as a3, hasRole as a4, isKnownAriaRole as a5, makeResolveTag as a6, mergeProps as a7, resolveTag as a8, type AriaFix as b, type AriaFixResult as c, type AriaInvalidResult as d, type AriaInvalidWithFix as e, type AriaInvalidWithoutFix as f, type AriaPhase as g, type AriaResult as h, type AriaRole as i, type AriaRule as j, type CVADefaults as k, type CVAVariants as l, type Cardinality as m, type CardinalityInput as n, type ChildRuleInput as o, type ChildRuleMatch as p, type ChildRulePosition as q, type ClassName as r, type ClassPipelineFn as s, type ClassPipelineFn$1 as t, type ClassPipelineOptions as u, type ClassPlugin as v, type ClassPluginFactory as w, type CompoundVariant as x, type DefaultVariants as y, type EmptyRecord as z };
