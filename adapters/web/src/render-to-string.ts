import type { AnyRecord, ElementType } from '@praxis-kit/core'
import { applyFilter } from '@praxis-kit/adapter-utils'
import type { LooseBundle, UnknownProps, WebContractComponent } from './types/index'

type RegistryEntry = { bundle: LooseBundle }

const ssrRegistry = new WeakMap<WebContractComponent, RegistryEntry>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(cls: WebContractComponent, bundle: LooseBundle): void {
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
 * Renders a praxis-kit web component to an HTML string without requiring a DOM.
 *
 * Tag polymorphism works correctly in SSR — `options.tag` and the `as` prop
 * are resolved directly to the HTML element tag.
 *
 * `innerHTML` is treated as a pre-sanitized HTML string and inserted verbatim.
 * Callers are responsible for escaping any untrusted content before passing it.
 */
export function renderToString(
  component: WebContractComponent,
  props: UnknownProps = {},
  innerHTML = '',
): string {
  const entry = ssrRegistry.get(component)
  if (!entry) {
    const name = (component as { name?: string }).name ?? 'AnonymousComponent'
    throw new Error(
      `[renderToString] ${name} was not registered for SSR. ` +
        'Ensure it was created with createContractComponent from @praxis-kit/web.',
    )
  }

  const { bundle } = entry
  const { as, className, recipe, class: classAttr, ...rest } = props

  const tag = bundle.runtime.resolveTag(as as ElementType | undefined)
  const mergedProps = bundle.runtime.resolveProps(rest)
  const resolvedClass = bundle.runtime.resolveClasses(
    tag,
    mergedProps,
    (className as string | undefined) ?? (classAttr as string | undefined),
    recipe as string | undefined,
  )

  const ariaResult = bundle.runtime.resolveAria(tag, mergedProps)
  const filtered = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys,
  )

  const attrs: AnyRecord = { ...filtered, class: resolvedClass || undefined }
  const attrStr = buildAttrString(attrs)

  return `<${tag}${attrStr}>${innerHTML}</${tag}>`
}
