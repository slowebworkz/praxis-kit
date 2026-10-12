import type { IntrinsicTag } from './intrinsic-tag'

/**
 * A reference to another praxis-kit component (or any function/class-shaped value) passed as
 * `as`/`allowedAs` instead of a tag-name string — e.g. `<Button as={Link} />`. Deliberately as
 * loose as the `(string & {})` branch is for tag names: this file can't know "praxis-kit built
 * it," so, like the string branch, it accepts the shape and leaves real validation to runtime
 * (`allowedAs`'s reference-equality check) and to the receiving framework's own rendering. The
 * call-signature and constructor-signature members cover React/Preact/Solid function components
 * and Lit/Web classes respectively; `object` covers Vue's `defineComponent` result. (Deliberately
 * not the bare `Function` type here — too unsafe even for this file's own "as loose as a tag
 * name" philosophy, and these two signatures say precisely what `Function` would only imply.)
 */
export type ComponentReference =
  | ((...args: never[]) => unknown)
  | (new (...args: never[]) => unknown)
  | (object & Record<PropertyKey, unknown>)

export type ElementType = IntrinsicTag | (string & {}) | ComponentReference

/**
 * Resolves a component's default tag to its real DOM interface — `HTMLDialogElement` for
 * `'dialog'`, `HTMLDetailsElement` for `'details'`, and so on — falling back to `HTMLElement`
 * for custom-element tags or anything not in `HTMLElementTagNameMap`. Used to type
 * `FactoryOptions.onElement`'s `element` param so component authors get direct, correctly-typed
 * access to tag-specific native members (`dialogEl.showModal()`) without an unsafe cast.
 *
 * The fallback is `HTMLElement`, not the more generic `Element` — every tag reachable through
 * `IntrinsicTag` extends it, and so does every custom element per spec, so members `HTMLElement`
 * itself declares (`showPopover()`/`hidePopover()`/`togglePopover()`, the `popover` attribute)
 * stay directly accessible even for tags with no dedicated entry in `HTMLElementTagNameMap`.
 */
export type ElementForTag<TDefault extends ElementType> =
  TDefault extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[TDefault] : HTMLElement
