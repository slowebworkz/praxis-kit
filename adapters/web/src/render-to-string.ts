import { renderBundleToString } from '@praxis-kit/adapter-utils'
import type { LooseBundle, RegistryEntry, UnknownProps, WebContractComponent } from './types/index'

const ssrRegistry = new WeakMap<WebContractComponent, RegistryEntry>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(cls: WebContractComponent, bundle: LooseBundle): void {
  ssrRegistry.set(cls, { bundle })
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

  return renderBundleToString(entry.bundle, props, innerHTML)
}
