import { LitElement, html } from 'lit'
import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@praxis-ui/core'
import { applyFilter } from '@praxis-ui/adapter-utils'
import { buildRuntime } from './build-runtime'
import type { LitFactoryOptions } from './types/index'
import type { BuiltRuntime, LooseRuntime, UnknownProps } from './types/index'

/**
 * Applies resolved class string and filtered ARIA props to the host element.
 *
 * In Lit the component IS the host custom element — we cannot swap the
 * rendered tag (custom elements have a fixed tag name). The `as` prop is
 * forwarded to `resolveTag` solely for ARIA role inference; it does not
 * change the element tag.
 *
 * This adapter targets Light DOM composition only. Shadow DOM slot protocol
 * is out of scope: `createRenderRoot` returns `this` so the class pipeline
 * applies directly to the host and Tailwind utilities resolve correctly.
 */
// applyToHost receives the runtime erased to LooseRuntime so resolveClasses
// accepts a plain string variantKey rather than a specific preset key union.
type LooseBundle = {
  runtime: LooseRuntime
  filterProps: BuiltRuntime<PolymorphicGenerics>['filterProps']
  childrenEvaluator?: BuiltRuntime<PolymorphicGenerics>['childrenEvaluator']
}

function applyToHost(host: LitElement, bundle: LooseBundle, props: UnknownProps): void {
  const { as, className, variantKey, ...rest } = props
  const tag = bundle.runtime.resolveTag(as as ElementType | undefined)
  const mergedProps = bundle.runtime.resolveProps(rest)
  const resolvedClass = bundle.runtime.resolveClasses(
    tag,
    mergedProps,
    className as string | undefined,
    variantKey as string | undefined,
  )
  const ariaResult = bundle.runtime.resolveAria(tag, mergedProps)
  const filteredProps = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys,
  )

  host.className = resolvedClass

  for (const key in filteredProps) {
    if (!Object.hasOwn(filteredProps, key)) continue
    const value = filteredProps[key]
    if (value === undefined || value === null || value === false) {
      host.removeAttribute(key)
    } else if (value === true) {
      host.setAttribute(key, '')
    } else {
      host.setAttribute(key, String(value))
    }
  }
}

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
 *
 * Usage in Lit templates:
 * ```ts
 * html`<praxis-button intent="primary">Save</praxis-button>`
 * ```
 */
export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: LitFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as LitFactoryOptions<TDefault, Props, Variants, TPreset>)
  const looseBundle = bundle as unknown as LooseBundle

  const variantKeys = options.styling?.variants ? Object.keys(options.styling.variants) : []

  // Static properties map for Lit reactive property system.
  // Variant keys are declared as string-typed properties so Lit observes them
  // and triggers updated() when they change.
  const staticProps: Record<string, { type: typeof String; attribute: string | boolean }> = {
    as: { type: String, attribute: 'as' },
    variantKey: { type: String, attribute: 'variant-key' },
  }
  for (const key of variantKeys) {
    staticProps[key] = { type: String, attribute: key }
  }

  class PolymorphicLitElement extends LitElement {
    // Declare static properties for Lit reactivity — no decorators needed.
    static override get properties() {
      return staticProps
    }

    // Light DOM: class pipeline applies directly to the host element.
    protected override createRenderRoot() {
      return this
    }

    // Lit calls updated() after every render including the first, so there is
    // no need to also call _applyPraxis() in connectedCallback(). Using updated()
    // alone avoids double-applying on initial mount.
    override updated(changed: Map<PropertyKey, unknown>) {
      super.updated(changed)
      this._applyPraxis()
    }

    private _applyPraxis() {
      const self = this as unknown as AnyRecord
      const props: UnknownProps = { as: self['as'], variantKey: self['variantKey'] }
      for (const key of variantKeys) {
        if (self[key] !== undefined) props[key] = self[key]
      }
      applyToHost(this, looseBundle, props)
    }

    override render() {
      if (bundle.childrenEvaluator) {
        bundle.childrenEvaluator.evaluate(Array.from(this.childNodes))
      }
      return html`<slot></slot>`
    }
  }

  if (options.name) {
    Object.defineProperty(PolymorphicLitElement, 'name', { value: options.name })
  }

  return PolymorphicLitElement
}
