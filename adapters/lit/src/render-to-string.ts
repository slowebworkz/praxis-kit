import { renderBundleToString } from '@praxis-kit/adapter-utils'
import type { LitContractComponent, LooseBundle, RegistryEntry, UnknownProps } from './types'

// LitContractComponent is a constructor (object) — WeakMap key works directly.
const ssrRegistry = new WeakMap<LitContractComponent, RegistryEntry>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(cls: LitContractComponent, bundle: LooseBundle): void {
  ssrRegistry.set(cls, { bundle })
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

  return renderBundleToString(entry.bundle, props, innerHTML)
}
