import { LitElement, html } from 'lit'
import type { AnyRecord, ElementType, EmptyRecord, PresetMap, VariantMap } from '@praxis-ui/core'
import { applyFilter } from '@praxis-ui/adapter-utils'
import { buildRuntime } from './build-runtime'
import type { LooseBundle, LitFactoryOptions, UnknownProps } from './types/index'

function isLooseBundle(arg: unknown): arg is LooseBundle {
  if (typeof arg !== 'object' || arg === null) return false
  const obj = arg as AnyRecord

  const runtime = obj['runtime']
  if (typeof runtime !== 'object' || runtime === null) return false
  const rt = runtime as AnyRecord
  if (typeof rt['resolveTag'] !== 'function') return false
  if (typeof rt['resolveProps'] !== 'function') return false
  if (typeof rt['resolveClasses'] !== 'function') return false
  if (typeof rt['resolveAria'] !== 'function') return false
  if (typeof rt['options'] !== 'object' || rt['options'] === null) return false

  if (typeof obj['filterProps'] !== 'function') return false

  if (Object.hasOwn(obj, 'childrenEvaluator') && obj['childrenEvaluator'] !== undefined) {
    const ce = obj['childrenEvaluator']
    if (typeof ce !== 'object' || ce === null) return false
    if (typeof (ce as AnyRecord)['evaluate'] !== 'function') return false
  }

  return true
}

function toLooseBundle(bundle: unknown): LooseBundle {
  if (!isLooseBundle(bundle)) {
    throw new Error('[createContractComponent] buildRuntime returned an unexpected shape.')
  }
  return bundle
}

/**
 * Pure: resolves the class string and filtered attribute map from current props.
 *
 * Separating resolution from DOM mutation makes this logic testable without a
 * real DOM and keeps applyHostState as a simple write-only function.
 */
function resolveHostState(
  bundle: LooseBundle,
  props: UnknownProps,
): { className: string; attributes: AnyRecord } {
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
  const attributes = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys,
  )
  return { className: resolvedClass, attributes }
}

/**
 * Applies resolved state to the host element.
 *
 * In Lit Light DOM the custom element IS the DOM element — variant props
 * managed by Lit's property system remain as DOM attributes (expected Lit
 * behaviour). applyHostState sets/removes non-variant attributes from the
 * ARIA-filtered output. Attributes that the ARIA engine removed (e.g. a
 * redundant role="navigation" on a <nav>) are explicitly cleared so they
 * don't persist on the host from the original setAttribute call.
 */
function applyHostState(
  host: LitElement,
  state: ReturnType<typeof resolveHostState>,
  incomingProps: UnknownProps,
): void {
  host.className = state.className

  // Explicitly remove aria-* and role attributes that the ARIA engine stripped
  // (e.g. redundant role="navigation" on a <nav>). Variant keys are excluded —
  // removing them would trigger Lit's attribute observation and reset the property.
  for (const key in incomingProps) {
    if (!Object.hasOwn(incomingProps, key)) continue
    if (!key.startsWith('aria-') && key !== 'role') continue
    if (!Object.hasOwn(state.attributes, key)) {
      host.removeAttribute(key)
    }
  }

  for (const key in state.attributes) {
    if (!Object.hasOwn(state.attributes, key)) continue
    const value = state.attributes[key]
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
 */
export function createContractComponent<
  TDefault extends ElementType,
  TProps extends UnknownProps = EmptyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<TVariants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: LitFactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as LitFactoryOptions<TDefault, TProps, TVariants, TPreset>)
  const looseBundle = toLooseBundle(bundle)

  const variantKeys = options.styling?.variants ? Object.keys(options.styling.variants) : []

  const staticProps: Record<string, { type: typeof String; attribute: string | boolean }> = {
    as: { type: String, attribute: 'as' },
    variantKey: { type: String, attribute: 'variant-key' },
  }
  for (const key of variantKeys) {
    staticProps[key] = { type: String, attribute: key }
  }

  class PolymorphicLitElement extends LitElement {
    static override get properties() {
      return staticProps
    }

    // Light DOM — class pipeline applies directly to the host element.
    protected override createRenderRoot() {
      return this
    }

    // Run after every Lit update. Non-reactive attributes (aria-*, role, data-*)
    // don't trigger Lit's property system so they can't be guarded by `changed`;
    // always running ensures they're picked up from this.attributes on the next
    // reactive property change that does trigger an update.
    // TODO: add selective guard once the adapter is production-proven.
    override updated(changed: Map<PropertyKey, unknown>) {
      super.updated(changed)
      this._applyPraxis()
    }

    private _applyPraxis() {
      const self = this as unknown as AnyRecord

      // Start with all current DOM attributes so the ARIA engine sees role,
      // aria-*, and any other pass-through attributes.
      const props: UnknownProps = {}
      for (const attr of Array.from(this.attributes)) {
        if (attr.name !== 'class') props[attr.name] = attr.value
      }

      // Overlay Lit-managed properties for variant keys — these may differ
      // from raw attribute strings if Lit has type-coerced them.
      props['as'] = self['as']
      props['variantKey'] = self['variantKey']
      for (const key of variantKeys) {
        // Lit sets removed attributes to null; treat null the same as undefined
        // so CVA falls back to defaultVariants when no explicit value is present.
        if (self[key] != null) props[key] = self[key]
      }

      applyHostState(this, resolveHostState(looseBundle, props), props)
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
