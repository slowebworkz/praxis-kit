import type { ComponentReference } from '../element-type'

/**
 * Declares that this component should always render as if composed `asChild` into another
 * praxis-kit component — `compose: { with: Button }` behaves, for an ordinary (non-`asChild`,
 * non-`render`) consumer call, exactly like hand-writing `<Button asChild><ThisComponent
 * {...props} /></Button>`: all consumer props land on this component's own contract exactly as
 * today, and `with` renders bare, cloning its own resolved output onto whatever this component
 * renders as — the same nested-`asChild` shape a consumer could already hand-write.
 *
 * If the consumer explicitly passes `asChild` or `render` themselves, that always wins and
 * `compose` does not apply — the same precedence `as` already has over `defaultTag`.
 *
 * Supported on React, Preact, and Vue (clone-based `asChild`) and Solid/Svelte (synthesized
 * through their own render-callback/snippet composition model). Not supported on Lit/Web, which
 * have no `asChild` concept at all — `compose` has no effect there, matching the same adapter
 * boundary `nativeTagBehavior` and the component-reference `as`/`allowedAs` feature already
 * document.
 *
 * `with` is not currently validated at runtime or constrained to "a real praxis-kit component" at
 * the type level — the same trust `FactoryOptions.subComponents` already places in its own
 * component-reference values.
 */
export type ComposeOptions = {
  readonly with: ComponentReference
}
