import { ElementType, AnyRecord, EmptyRecord, VariantMap, PresetMap, FactoryOptions, StrictMode } from '@praxis-ui/core';

type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean;

/**
 * Options accepted by createContractComponent in the web adapter.
 *
 * Identical shape to LitFactoryOptions — a plain HTMLElement subclass with
 * no framework dependency. Light DOM only; Shadow DOM is out of scope.
 */
type WebFactoryOptions<TDefault extends ElementType = ElementType, TProps extends AnyRecord = EmptyRecord, TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<TVariants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps> & {
    readonly filterProps?: FilterPredicate;
};

type UnknownProps = Record<string, unknown>;
/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the public contract without exposing HTMLElement's internal members.
 * Variant key instance properties are typed via TVariants.
 */
type WebContractComponent<TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>> = {
    new (): HTMLElement & {
        as: string | undefined;
        variantKey: string | undefined;
        praxisClass: string | undefined;
        /** Re-runs the pipeline — call after setting non-reactive attributes (aria-*, role, data-*). */
        update(): void;
    } & {
        [K in Extract<keyof TVariants, string>]?: string | null;
    };
    /** The resolved strict mode for this component — usable by subclasses for custom enforcement. */
    readonly strict: Exclude<StrictMode, undefined>;
};

/**
 * Creates a plain `HTMLElement` subclass with praxis-ui contracts applied.
 *
 * No framework dependency. Register with `customElements.define()`:
 *
 * ```ts
 * const Button = createContractComponent({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: {
 *     base: 'btn',
 *     variants: { intent: { primary: 'btn--primary', ghost: 'btn--ghost' } },
 *     defaults: { intent: 'primary' },
 *   },
 *   enforcement: { strict: 'warn' },
 * })
 *
 * customElements.define('praxis-button', Button)
 * ```
 *
 * The pipeline runs synchronously on `connectedCallback` and on every
 * `attributeChangedCallback` for praxis-owned attributes (variant keys,
 * `as`, `variant-key`, `praxis-class`).
 *
 * For non-reactive attributes (`aria-*`, `role`, `data-*`) call `element.update()`
 * after setting them to trigger an explicit pipeline re-run.
 */
declare function createContractComponent<TDefault extends ElementType, TProps extends UnknownProps = EmptyRecord, TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<TVariants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: WebFactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps>): WebContractComponent<TVariants>;

/**
 * Renders a praxis-ui web component to an HTML string without requiring a DOM.
 *
 * Tag polymorphism works correctly in SSR — `options.tag` and the `as` prop
 * are resolved directly to the HTML element tag.
 *
 * `innerHTML` is treated as a pre-sanitized HTML string and inserted verbatim.
 * Callers are responsible for escaping any untrusted content before passing it.
 */
declare function renderToString(component: WebContractComponent, props?: UnknownProps, innerHTML?: string): string;

export { type WebContractComponent, type WebFactoryOptions, createContractComponent, renderToString };
