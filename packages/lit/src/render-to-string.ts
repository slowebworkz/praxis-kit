import type { AnyRecord, ElementType } from '@praxis-ui/core'
import { applyFilter } from '@praxis-ui/adapter-utils'
import type { LitContractComponent, LooseBundle, UnknownProps } from './types/index'

type RegistryEntry = { bundle: LooseBundle }

// LitContractComponent is a constructor (object) — WeakMap key works directly.
const ssrRegistry = new WeakMap<LitContractComponent, RegistryEntry>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(cls: LitContractComponent, bundle: LooseBundle): void {
  ssrRegistry.set(cls, { bundle })
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
        'Ensure it was created with createContractComponent from @praxis-ui/lit.',
    )
  }

  const { bundle } = entry
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

  const ariaResult = bundle.runtime.resolveAria(tag, mergedProps)
  const filtered = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys,
  )

  // resolvedClass wins — spread filtered first so the pipeline output always takes precedence.
  const attrs: AnyRecord = { ...filtered, class: resolvedClass || undefined }
  const attrStr = buildAttrString(attrs)

  return `<${tag}${attrStr}>${innerHTML}</${tag}>`
}
