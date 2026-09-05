import { renderBundleToString } from '@praxis-kit/adapter-utils'
import type { LitContractComponent, LooseBundle, RegistryEntry, UnknownProps } from './types'

// LitContractComponent is a constructor (object) — WeakMap key works directly.
//
// Module-local: a second, separately-bundled copy of this adapter package would get its own
// registry, and a class registered against one copy wouldn't resolve against the other's
// renderToString. Not a concern today (the monorepo consumes everything from one source copy),
// but worth flagging for when `packages/kit` starts assembling/bundling these adapters for
// publish — verify there's exactly one copy of this module in the published graph, the same
// "single identity" invariant `packages/kit/README.md` already calls out for `Diagnostics`.
const ssrRegistry = new WeakMap<LitContractComponent, RegistryEntry>()

/** Called by createContractComponent to enable renderToString for a class. */
export function registerForSsr(cls: LitContractComponent, bundle: LooseBundle): void {
  ssrRegistry.set(cls, { bundle })
}

/**
 * Renders a praxis-kit Lit component to an HTML string without requiring a DOM.
 *
 * The output tag is always `options.tag` — never influenced by an `as` key on `props`, which is
 * stripped below before reaching the shared `renderBundleToString`. See the `as` note on
 * `createContractComponent`'s own doc comment for why: this adapter has no tag polymorphism at
 * all (`capabilities.tagPolymorphism: false`), on either the client or the SSR path, so there is
 * nothing here for `as` to resolve to that would ever match what the live custom element renders.
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

  // `as` intentionally discarded — see this function's own doc comment above.
  const { as: _as, ...rest } = props
  return renderBundleToString(entry.bundle, rest, innerHTML)
}
