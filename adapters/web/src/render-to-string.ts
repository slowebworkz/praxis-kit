import { renderBundleToString } from '@praxis-kit/adapter-utils'
import type { LooseBundle, RegistryEntry, UnknownProps, WebContractComponent } from './types/index'

// Module-local: a second, separately-bundled copy of this adapter package would get its own
// registry, and a class registered against one copy wouldn't resolve against the other's
// renderToString. Not a concern today (the monorepo consumes everything from one source copy),
// but worth flagging for when `packages/kit` starts assembling/bundling these adapters for
// publish — same "single identity across the published graph" invariant already noted on Lit's
// identical registry (`adapters/lit/src/render-to-string.ts`).
const ssrRegistry = new WeakMap<WebContractComponent, RegistryEntry>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(cls: WebContractComponent, bundle: LooseBundle): void {
  ssrRegistry.set(cls, { bundle })
}

/**
 * Renders a praxis-kit web component to an HTML string without requiring a DOM.
 *
 * The output tag is always `options.tag` — never influenced by an `as` key on `props`, which is
 * stripped below before reaching the shared `renderBundleToString`. See the `as` note on
 * `createContractComponent`'s own doc comment for why: this adapter has no tag polymorphism at
 * all, on either the client or the SSR path, so there is nothing here for `as` to resolve to that
 * would ever match what the live custom element renders.
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

  // `as` intentionally discarded — see this function's own doc comment above.
  const { as: _as, ...rest } = props
  return renderBundleToString(entry.bundle, rest, innerHTML)
}
