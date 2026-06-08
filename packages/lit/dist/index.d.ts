import { ElementType, AnyRecord, EmptyRecord, VariantMap, PresetMap, FactoryOptions } from '@praxis-ui/core';
import { LitElement } from 'lit';

type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean;

/**
 * Options accepted by createContractComponent in the Lit adapter.
 *
 * Extends FactoryOptions with one Lit-specific field:
 * - filterProps: determines whether a prop should be omitted before it is
 *   reflected as a DOM attribute. Variant keys and plugin-owned keys are
 *   always omitted; this predicate extends that set.
 *
 * Note: this adapter targets Light DOM composition only. Shadow DOM slot
 * protocol is intentionally out of scope.
 */
type LitFactoryOptions<TDefault extends ElementType = ElementType, TProps extends AnyRecord = EmptyRecord, TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<TVariants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps> & {
    readonly filterProps?: FilterPredicate;
};

type UnknownProps = AnyRecord;
/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the class contract without exposing LitElement's private members
 * (which would trigger TS4094 in declaration emit). Variant key instance
 * properties are typed via the TVariants parameter.
 */
type LitContractComponent<TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>> = {
    new (): LitElement & {
        as: string | undefined;
        variantKey: string | undefined;
        praxisClass: string | undefined;
    } & {
        [K in Extract<keyof TVariants, string>]?: string | null;
    };
};

/**
 * Creates a Lit custom element class with praxis-ui contracts applied.
 *
 * Returns a LitElement subclass. Register it with customElements.define():
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
 */
declare function createContractComponent<TDefault extends ElementType, TProps extends UnknownProps = EmptyRecord, TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>, TPreset extends PresetMap<TVariants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord>(options: LitFactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps>): LitContractComponent<TVariants>;

/**
 * Renders a praxis-ui Lit component to an HTML string without requiring a DOM.
 *
 * Unlike the DOM adapter, SSR resolves the HTML tag directly from `options.tag`
 * and the `as` prop — tag polymorphism works correctly in server-rendered output.
 *
 * `innerHTML` is treated as a pre-sanitized HTML string and inserted verbatim.
 * Callers are responsible for escaping any untrusted content before passing it.
 *
 * ```ts
 * // @vitest-environment node
 * const html = renderToString(Button, { intent: 'primary', size: 'lg' })
 * // => '<button class="btn btn-primary btn-lg"></button>'
 * ```
 */
declare function renderToString(component: LitContractComponent, props?: UnknownProps, innerHTML?: string): string;

export { type LitContractComponent, type LitFactoryOptions, createContractComponent, renderToString };
