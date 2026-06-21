import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { applyFilter } from '@praxis-kit/adapter-utils'
import { buildRuntime } from './build-runtime'
import { registerForSsr } from './render-to-string'
import type {
  LooseBundle,
  WebContractComponent,
  WebFactoryOptions,
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

function resolveHostState(
  bundle: LooseBundle,
  props: UnknownProps,
): { className: string; attributes: AnyRecord } {
  const { as, className, recipe, ...rest } = props
  const tag = bundle.runtime.resolveTag(as as ElementType | undefined)
  const mergedProps = bundle.runtime.resolveProps(rest)
  const baseProps = bundle.runtime.options.normalizeFn
    ? bundle.runtime.options.normalizeFn(mergedProps)
    : mergedProps
  const htmlNormalizers = bundle.runtime.options.htmlPropNormalizersFn?.(tag)
  const normalizedProps = htmlNormalizers?.length
    ? htmlNormalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), baseProps)
    : baseProps
  const resolvedClass = bundle.runtime.resolveClasses(
    tag,
    normalizedProps,
    className as string | undefined,
    recipe as string | undefined,
  )
  const ariaResult = bundle.runtime.resolveAria(tag, normalizedProps)
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
 * `prevPipelineAttrs` tracks attribute keys the pipeline set last run so stale
 * ones are removed when they disappear from the resolved output.
 *
 * Variant key attributes are intentionally never removed here — in a vanilla
 * custom element they are plain DOM attributes the consumer manages; removing
 * them from the pipeline side would cause a double-remove bug.
 */
function applyHostState(
  host: HTMLElement,
  state: ReturnType<typeof resolveHostState>,
  prevPipelineAttrs: Set<string>,
  incomingProps: UnknownProps,
): void {
  host.className = state.className

  for (const key of prevPipelineAttrs) {
    if (!Object.hasOwn(state.attributes, key)) host.removeAttribute(key)
  }
  prevPipelineAttrs.clear()

  // Remove aria-* and role attributes the ARIA engine stripped this run.
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
 * Creates a plain `HTMLElement` subclass with praxis-kit contracts applied.
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
export function createContractComponent<
  TDefault extends ElementType,
  TProps extends UnknownProps = EmptyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<TVariants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
>(
  options: WebFactoryOptions<TDefault, TProps, TVariants, TPreset, TPlugin>,
): WebContractComponent<TVariants, ExtractPluginProps<TPlugin>> {
  const bundle = buildRuntime(options as WebFactoryOptions<TDefault, TProps, TVariants, TPreset>)
  const looseBundle = toLooseBundle(bundle)

  const variantKeys = options.styling?.variants ? Object.keys(options.styling.variants) : []
  const pluginKeys: readonly string[] =
    'classPlugin' in bundle.runtime ? [...(bundle.runtime.classPlugin.ownedKeys ?? [])] : []

  // Attribute names observed by the browser's native attribute-change callback.
  // Variant keys use their raw name; praxisClass maps to the 'praxis-class' attribute
  // to avoid a circular class→pipeline→class read.
  const observedAttrNames = ['as', 'variant-key', 'praxis-class', ...variantKeys, ...pluginKeys]

  type InstanceProps = {
    as: string | undefined
    recipe: string | undefined
    praxisClass: string | undefined
  } & { [K in Extract<keyof TVariants, string>]?: string | null } & ExtractPluginProps<TPlugin>

  // In SSR (Node) environments HTMLElement is not defined. The class still needs
  // to be created so registerForSsr() can register the bundle — but the element
  // lifecycle methods (connectedCallback, attributeChangedCallback) will never
  // run server-side; only renderToString() is used.
  const BaseElement: typeof HTMLElement =
    typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement)

  class PolymorphicWebElement extends BaseElement {
    // Tracks keys set by the pipeline last run so stale ones are removed.
    private _pipelineAttrs = new Set<string>()

    static get observedAttributes(): string[] {
      return observedAttrNames
    }

    connectedCallback(): void {
      this._applyPraxis()
    }

    // Fires synchronously for every observed attribute change — no microtask
    // scheduling needed. The guard is implicit: this only fires for
    // observedAttributes, all of which are praxis-owned.
    attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
      if (this.isConnected) {
        this._applyPraxis()
      }
    }

    /** Re-runs the pipeline. Call after setting non-reactive attributes (aria-*, role, data-*). */
    update(): void {
      this._applyPraxis()
    }

    private get _self(): InstanceProps {
      return this as unknown as InstanceProps
    }

    private _applyPraxis(): void {
      const self = this._self

      if (bundle.childrenEvaluator) {
        bundle.childrenEvaluator.evaluate(Array.from(this.childNodes))
      }

      // Skip 'class' (pipeline output) and all observedAttributes. Observed attrs
      // are either read as camelCase below (variant keys, as, praxis-class) or
      // are user-added observed attrs (e.g. 'value' in a subclass) that must not
      // leak into state.attributes — setAttribute on an observed attr would
      // re-trigger this callback and cause infinite recursion.
      const observedSet = new Set(
        (this.constructor as { observedAttributes?: readonly string[] }).observedAttributes ?? [],
      )
      const props: UnknownProps = {}
      for (const attr of Array.from(this.attributes)) {
        if (attr.name === 'class' || observedSet.has(attr.name)) continue
        props[attr.name] = attr.value
      }

      // Overlay the typed view of praxis-owned attributes; attribute values are
      // always strings, but consumers may set them via property too.
      props['as'] = self.as ?? this.getAttribute('as') ?? undefined
      props['recipe'] = self.recipe ?? this.getAttribute('variant-key') ?? undefined
      props['className'] = self.praxisClass ?? this.getAttribute('praxis-class') ?? undefined

      for (const key of variantKeys) {
        const val = self[key as Extract<keyof TVariants, string>] ?? this.getAttribute(key)
        if (val != null) props[key] = val
      }

      applyHostState(this, resolveHostState(looseBundle, props), this._pipelineAttrs, props)
    }
  }

  if (options.name) {
    Object.defineProperty(PolymorphicWebElement, 'name', { value: options.name })
  }

  Object.defineProperty(PolymorphicWebElement, 'strict', { value: bundle.strict })

  registerForSsr(PolymorphicWebElement as unknown as WebContractComponent, looseBundle)

  return PolymorphicWebElement as unknown as WebContractComponent<
    TVariants,
    ExtractPluginProps<TPlugin>
  >
}
