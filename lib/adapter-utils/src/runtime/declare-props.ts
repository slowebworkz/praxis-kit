/**
 * Type-only prop declaration helper for a `defineContract` config's `props` field
 * (`FactoryOptions.props`, `lib/primitive`) — never called for its return value (always
 * `undefined` at runtime), only for its type. Exists so an author can declare a component's
 * complete prop shape inline, in the same object literal `defineContract`'s single `const O`
 * parameter already infers from, without a separate generic argument at the
 * `defineContract`/`createContractComponent` call site itself — the fix for the gap
 * `ContractPropsFrom` (`lib/primitive`) documents: `defaults` alone can only prove a prop *has
 * a default*, not that it's the complete prop model.
 *
 * ```ts
 * interface ButtonProps {
 *   onClick?: () => void
 *   disabled?: boolean
 * }
 *
 * const buttonContract = defineContract({
 *   tag: 'button',
 *   name: 'Button',
 *   props: declareProps<ButtonProps>(),
 *   defaults: { type: 'button' },
 * })
 * ```
 *
 * Optional — most contracts still don't need this. Only reach for it when `defaults` doesn't
 * already capture every prop the component accepts.
 *
 * Bounded by `object`, not `AnyRecord` (`Record<string, unknown>`) like `Props` is everywhere else
 * in this pipeline — deliberately. A hand-declared `interface`/`type` prop shape (the overwhelmingly
 * common case an author reaches for here) has no index signature, and TypeScript's generic
 * *constraint* satisfaction (unlike plain value assignment) requires one to satisfy
 * `Record<string, unknown>` — a real, well-known TypeScript limitation, not a design choice this
 * file is working around loosely. `object` has no such requirement and accepts the same real
 * interfaces plain assignment already does; `ContractPropsFrom` (`lib/primitive`) matches this
 * field back out with the identical `object`-bounded pattern for the same reason.
 */
export function declareProps<Props extends object>(): Props | undefined {
  return undefined
}
