/**
 * Well-known Symbol stamped onto every component created by praxis-kit factories.
 * The value stored at this key is a unique Symbol via Symbol.for(), scoped to the
 * component name. HOC wrappers (memo, forwardRef, styled, etc.) must propagate it
 * explicitly: `Wrapped[COMPONENT_ID] = Original[COMPONENT_ID]`.
 */
export const COMPONENT_ID: unique symbol = Symbol('praxis.component-id')

export type WithComponentId = {
  [COMPONENT_ID]?: symbol
}
