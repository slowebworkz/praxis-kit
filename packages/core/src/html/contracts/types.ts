import type { ChildRuleInput, EnforcementOptions } from '../../types'

export type { ChildRuleInput } from '../../types'
export type { EnforcementOptions }

/** A sequence of child rules describing an element's permitted content model. */
export type ChildContract = readonly ChildRuleInput[]

/**
 * An HTML element tag name.
 *
 * This is intentionally aliased rather than using `string` directly so it can be
 * narrowed to a canonical tag union in the future without changing consumers.
 */
export type HtmlTag = string

/** A readonly collection of HTML tag names. */
export type HtmlTags = readonly HtmlTag[]

/**
 * A group of HTML tags that all share the same enforcement contract.
 *
 * Used to define one contract for multiple elements (for example, all void elements).
 */
export type ContractGroup = readonly [tags: HtmlTags, enforcement: EnforcementOptions]

/**
 * Minimal vnode shape required by the contract engine.
 *
 * Represents an intrinsic element or component with a resolved `type`, and
 * optionally `props` for rules that inspect element attributes.
 */
export interface VNodeLike {
  type: unknown
  props?: unknown
}

/** Predicate used to identify vnode-like children during contract evaluation. */
export type ChildMatcher = (child: unknown) => child is VNodeLike
