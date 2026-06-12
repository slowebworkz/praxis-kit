/**
 * Well-known Symbol stamped onto every component created by praxis-kit factories.
 * The value stored at this key is a unique Symbol via Symbol.for(), scoped to the
 * component name. HOC wrappers (memo, forwardRef, styled, etc.) must propagate it
 * explicitly: `Wrapped[COMPONENT_ID] = Original[COMPONENT_ID]`.
 */
export const COMPONENT_ID: unique symbol = Symbol('praxis.component-id')

/**
 * Well-known Symbol stamped onto every component created by praxis-kit factories.
 * Stores the factory's defaultTag — the tag that renders when no `as` prop is given.
 * HOC wrappers must propagate it: `Wrapped[COMPONENT_DEFAULT_TAG] = Original[COMPONENT_DEFAULT_TAG]`.
 */
export const COMPONENT_DEFAULT_TAG: unique symbol = Symbol('praxis.component-default-tag')

export type WithComponentId = {
  [COMPONENT_ID]?: symbol
  [COMPONENT_DEFAULT_TAG]?: string
}
