import { LitElement, html } from 'lit'
import type { AnyRecord, ElementType, EmptyRecord, PresetMap, VariantMap } from '@praxis-ui/core'
import { applyFilter } from '@praxis-ui/adapter-utils'
import { buildRuntime } from './build-runtime'
import { registerForSsr } from './render-to-string'
import type {
  LitContractComponent,
  LooseBundle,
  LitFactoryOptions,
  UnknownProps,
} from './types/index'

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}

function isLooseBundle(arg: unknown): arg is LooseBundle {
  if (!isObject(arg)) return false

  const { runtime, filterProps, childrenEvaluator } = arg
  if (!isObject(runtime)) return false
  if (!isObject(runtime['options'])) return false
  if (
    typeof runtime['resolveTag'] !== 'function' ||
    typeof runtime['resolveProps'] !== 'function' ||
    typeof runtime['resolveClasses'] !== 'function' ||
    typeof runtime['resolveAria'] !== 'function'
  )
    return false

  if (typeof filterProps !== 'function') return false

  if (
    childrenEvaluator !== undefined &&
    (!isObject(childrenEvaluator) || typeof childrenEvaluator['evaluate'] !== 'function')
  )
    return false

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
 * `prevPipelineAttrs` tracks which attribute keys the pipeline set in the
 * previous render. Any key present there but absent from the new state is
 * explicitly removed, preventing stale pipeline-managed attributes from
 * accumulating across renders.
 *
 * Variant keys are intentionally excluded — removing them triggers Lit's
 * attributeChangedCallback which resets the reactive property to null and
 * schedules another update, creating a feedback loop.
 */
function applyHostState(
  host: LitElement,
  state: ReturnType<typeof resolveHostState>,
  prevPipelineAttrs: Set<string>,
  incomingProps: UnknownProps,
): void {
  host.className = state.className

  // Remove pipeline-managed attributes absent from the new state (e.g. a
  // filterProps target that was set last render but is gone this render).
  for (const key of prevPipelineAttrs) {
    if (!Object.hasOwn(state.attributes, key)) {
      host.removeAttribute(key)
    }
  }
  prevPipelineAttrs.clear()

  // Remove aria-* and role attributes that the ARIA engine stripped this render
  // (e.g. redundant role="navigation" on a <nav>). These are user-set, not
  // pipeline-set, so they're not covered by _pipelineAttrs above.
  for (const key in incomingProps) {
    if (!Object.hasOwn(incomingProps, key)) continue
    if (!key.startsWith('aria-') && key !== 'role') continue
    if (!Object.hasOwn(state.attributes, key)) host.removeAttribute(key)
  }

  for (const key in state.attributes) {
    if (!Object.hasOwn(state.attributes, key)) continue
    const value = state.attributes[key]
    if (value === undefined || value === null || value === false) {
      host.removeAttribute(key)
    } else if (value === true) {
      host.setAttribute(key, '')
      prevPipelineAttrs.add(key)
    } else {
      host.setAttribute(key, String(value))
      prevPipelineAttrs.add(key)
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
>(
  options: LitFactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps>,
): LitContractComponent<TVariants> {
  const bundle = buildRuntime(options as LitFactoryOptions<TDefault, TProps, TVariants, TPreset>)
  const looseBundle = toLooseBundle(bundle)

  const variantKeys = options.styling?.variants ? Object.keys(options.styling.variants) : []

  // Set of reactive property keys owned by the praxis pipeline. Used in
  // requestUpdate() to decide whether a given property change requires a
  // pipeline re-run. Manual requestUpdate() calls (name === undefined) always
  // set the dirty flag so ARIA/role reconciliation is never skipped.
  const praxisProps = new Set<PropertyKey>(['as', 'variantKey', 'praxisClass', ...variantKeys])

  const staticProps: Record<string, { type: typeof String; attribute: string | boolean }> = {
    as: { type: String, attribute: 'as' },
    variantKey: { type: String, attribute: 'variant-key' },
    // External className input — separate from the pipeline-output `class`
    // attribute so _applyPraxis can read it without a circular class→pipeline→class loop.
    praxisClass: { type: String, attribute: 'praxis-class' },
  }
  for (const key of variantKeys) {
    staticProps[key] = { type: String, attribute: key }
  }

  // Typed view of the reactive instance properties that _applyPraxis reads.
  // `declare` emits no JS — Lit's finalize() installs the actual getters/setters
  // at runtime. The variant key index covers dynamic variant properties.
  type InstanceProps = {
    as: string | undefined
    variantKey: string | undefined
    praxisClass: string | undefined
  } & { [K in Extract<keyof TVariants, string>]?: string | null }

  class PolymorphicLitElement extends LitElement {
    declare as: string | undefined
    declare variantKey: string | undefined
    declare praxisClass: string | undefined

    // Tracks keys set by the pipeline last render so stale attrs are removed.
    private _pipelineAttrs = new Set<string>()
    // Starts true so the first update always runs the pipeline regardless of
    // what triggered it. Cleared after _applyPraxis() and re-set only when a
    // praxis-owned property changes or requestUpdate() is called manually.
    private _praxisDirty = true

    static override get properties() {
      return staticProps
    }

    // Light DOM — class pipeline applies directly to the host element.
    protected override createRenderRoot() {
      return this
    }

    // Guard: only re-run the pipeline when a praxis-owned property changed or
    // when requestUpdate() was called manually (name === undefined — covers
    // both the initial connection and consumer-driven ARIA attribute updates).
    // Updates triggered by non-praxis reactive properties on a subclass are
    // skipped, avoiding redundant pipeline runs on unrelated state changes.
    override requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
      if (name === undefined || praxisProps.has(name)) {
        this._praxisDirty = true
      }
      super.requestUpdate(name, oldValue)
    }

    override updated(changed: Map<PropertyKey, unknown>) {
      super.updated(changed)
      if (this._praxisDirty) {
        this._praxisDirty = false
        this._applyPraxis()
      }
    }

    // Single cast at the class boundary — Lit's finalize() installs the
    // reactive property getters/setters at runtime; this accessor exposes them
    // under the typed shape so _applyPraxis never needs to cast inline.
    private get _self(): InstanceProps {
      return this as unknown as InstanceProps
    }

    private _applyPraxis() {
      const self = this._self

      // Start with all current DOM attributes so the ARIA engine sees role,
      // aria-*, and any other pass-through attributes.
      const props: UnknownProps = {}
      for (const attr of Array.from(this.attributes)) {
        if (attr.name !== 'class') props[attr.name] = attr.value
      }

      // Overlay Lit-managed properties for variant keys — these may differ
      // from raw attribute strings if Lit has type-coerced them.
      props['as'] = self.as
      props['variantKey'] = self.variantKey
      props['className'] = self.praxisClass
      for (const key of variantKeys) {
        // Lit sets removed attributes to null; treat null the same as undefined
        // so CVA falls back to defaultVariants when no explicit value is present.
        const val = self[key as Extract<keyof TVariants, string>]
        if (val != null) props[key] = val
      }

      applyHostState(this, resolveHostState(looseBundle, props), this._pipelineAttrs, props)
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

  // Register for SSR before returning — renderToString looks up the bundle via WeakMap.
  registerForSsr(PolymorphicLitElement as unknown as LitContractComponent, looseBundle)

  // Variant key properties are installed by Lit's finalize() at runtime, not
  // statically declared — cast to the exported contract type here at the boundary.
  return PolymorphicLitElement as unknown as LitContractComponent<TVariants>
}
