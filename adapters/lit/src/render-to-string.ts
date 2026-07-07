import type { ElementType } from '@praxis-kit/core'
import { enforceAllowedAs } from '@praxis-kit/core'
import { applyFilter } from '@praxis-kit/adapter-utils'
import { iterate } from '@praxis-kit/primitive'
import type {
  LitContractComponent,
  LooseBundle,
  RegistryEntry,
  ResolvedAttributes,
  UnknownProps,
} from './types'

// LitContractComponent is a constructor (object) — WeakMap key works directly.
const ssrRegistry = new WeakMap<LitContractComponent, RegistryEntry>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(cls: LitContractComponent, bundle: LooseBundle): void {
  ssrRegistry.set(cls, { bundle })
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function buildAttrString(attributes: ResolvedAttributes): string {
  const parts: string[] = []
  iterate.forEachEntry(attributes, (key, value) => {
    if (value === false || value === null || value === undefined) return
    if (value === true) {
      parts.push(key)
    } else {
      parts.push(`${key}="${escapeAttr(String(value))}"`)
    }
  })
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

/**
 * Renders a praxis-kit Lit component to an HTML string without requiring a DOM.
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
export function renderToString(
  component: LitContractComponent,
  props: UnknownProps = {},
  innerHTML = '',
): string {
  const entry = ssrRegistry.get(component)
  if (!entry) {
    const name = (component as { name?: string }).name ?? 'AnonymousComponent'
    throw new Error(
      `[renderToString] ${name} was not registered for SSR. ` +
        'Ensure it was created with createContractComponent from @praxis-kit/lit.',
    )
  }

  const { bundle } = entry
  const { as, className, recipe, class: classAttr, ...rest } = props

  const tag = bundle.runtime.resolveTag(as as ElementType | undefined)
  if (bundle.runtime.options.allowedAs !== undefined) {
    enforceAllowedAs(
      tag,
      bundle.runtime.options.allowedAs,
      bundle.runtime.options.diagnostics,
      bundle.runtime.options.displayName,
    )
  }
  const mergedProps = bundle.runtime.resolveProps(rest)
  // Mirror resolveHostState's normalization step (create-contract-component.ts) so SSR
  // output doesn't diverge from the DOM adapter — e.g. disabled -> aria-disabled/data-disabled.
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
    // Accept both React-style className and HTML-native class
    (className as string | undefined) ?? (classAttr as string | undefined),
    recipe as string | undefined,
  )

  const ariaResult = bundle.runtime.resolveAria(tag, normalizedProps)
  const filtered = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys,
  )

  // resolvedClass wins — spread filtered first so the pipeline output always takes precedence.
  const attrs: ResolvedAttributes = { ...filtered, class: resolvedClass || undefined }
  const attrStr = buildAttrString(attrs)

  return `<${tag}${attrStr}>${innerHTML}</${tag}>`
}
