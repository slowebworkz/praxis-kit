import type { AnyRecord, ElementType } from '@praxis-ui/core'
import { applyFilter } from '@praxis-ui/adapter-utils'
import type { LitContractComponent, LooseBundle, UnknownProps } from './types/index'

// Registry mapping component classes → their SSR bundle and variant keys.
// WeakMap so registered classes can be garbage-collected normally.
const ssrRegistry = new WeakMap<object, { bundle: LooseBundle; variantKeys: readonly string[] }>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(
  cls: object,
  bundle: LooseBundle,
  variantKeys: readonly string[],
): void {
  ssrRegistry.set(cls, { bundle, variantKeys })
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function buildAttrString(attributes: AnyRecord): string {
  const parts: string[] = []
  for (const key in attributes) {
    if (!Object.hasOwn(attributes, key)) continue
    const value = attributes[key]
    if (value === false || value === null || value === undefined) continue
    if (value === true) {
      parts.push(key)
    } else {
      parts.push(`${key}="${escapeAttr(String(value))}"`)
    }
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

/**
 * Renders a praxis-ui Lit component to an HTML string without requiring a DOM.
 *
 * Unlike the DOM adapter, SSR uses the tag resolved from the `as` prop (or
 * `options.tag`) directly as the HTML element tag — tag polymorphism works
 * correctly in server-rendered output.
 *
 * The returned string is the opening+closing element. Pass `children` to
 * include inner HTML content.
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
  children = '',
): string {
  const entry = ssrRegistry.get(component as unknown as object)
  if (!entry) {
    throw new Error(
      '[renderToString] Component was not registered for SSR. ' +
        'Ensure it was created with createContractComponent from @praxis-ui/lit.',
    )
  }

  const { bundle, variantKeys } = entry
  const { as, className, variantKey, class: classAttr, ...rest } = props

  const tag = bundle.runtime.resolveTag(as as ElementType | undefined)
  const mergedProps = bundle.runtime.resolveProps(rest)
  const resolvedClass = bundle.runtime.resolveClasses(
    tag,
    mergedProps,
    // Accept both React-style className and HTML-native class
    (className as string | undefined) ?? (classAttr as string | undefined),
    variantKey as string | undefined,
  )

  // Collect variant key values for prop forwarding exclusion
  const variantValues: AnyRecord = {}
  for (const key of variantKeys) {
    if (rest[key] != null) variantValues[key] = rest[key]
  }

  const ariaResult = bundle.runtime.resolveAria(tag, mergedProps)
  const filtered = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys,
  )

  const attrs: AnyRecord = { class: resolvedClass || undefined, ...filtered }
  const attrStr = buildAttrString(attrs)

  return `<${tag}${attrStr}>${children}</${tag}>`
}
