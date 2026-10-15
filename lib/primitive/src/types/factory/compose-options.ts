import type { ComponentReference } from '../element-type'

/**
 * Declares that this component should always render as if composed `asChild` into another
 * praxis-kit component — `compose: { with: Button }` behaves, for an ordinary (non-`asChild`,
 * non-`render`) consumer call, exactly like hand-writing `<Button asChild><ThisComponent
 * {...props} /></Button>`: all consumer props land on this component's own contract exactly as
 * today, and `with` renders bare — with its own fixed defaults, receiving only `asChild`/`ref`/
 * `children` — cloning its own resolved output onto whatever this component renders as, the same
 * nested-`asChild` shape a consumer could already hand-write (where `Button` above also receives
 * no props beyond `asChild` unless the consumer separately passes them to `Button` itself).
 *
 * `with` has no way to see this component's own consumer-passed props or resolved variant
 * selections unless `allProps: true` is also set — set it to additionally forward this
 * component's own raw props onto `with` (alongside the `asChild`/`ref`/`children` it already
 * gets), so `with`'s own contract can resolve its variants/`compounds` against them the same way
 * it would if a consumer had hand-written `<Button {...props} asChild><ThisComponent {...props}
 * /></Button>`. Defaults to `false` to keep `with` rendering identically for every instance — the
 * original, non-breaking behavior — since forwarding is only safe when `with`'s own contract is
 * known not to have variant/prop names that collide with this component's own.
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
  readonly allProps?: boolean
  /**
   * Composition-scoped defaults for `with`. `defineContract` validates these keys and values
   * against the secondary component's retained contract when one is available. `object` is used
   * here so the broad `FactoryOptions` constraint doesn't erase the literal keys before that
   * relationship can be checked.
   */
  readonly defaults?: object
}
