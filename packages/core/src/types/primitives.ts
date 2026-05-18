/**
 * Generic record constraint used as the upper bound for `Props` throughout
 * the factory generics. String keys only — `PropertyKey` would admit symbols,
 * which HTML props and framework prop systems don't support.
 */
export type AnyRecord = Record<string, unknown>

/** A CSS class string. Aliased so renaming or narrowing is a one-line change. */
export type ClassName = string

/**
 * Optional subset of a component's own props, for use as default prop values.
 * Resolves to `never` for non-record types to prevent misuse at generic boundaries.
 */
export type DefaultProps<T> = T extends AnyRecord ? Partial<T> : never

/**
 * Framework-agnostic element type.
 *
 * `IntrinsicTag | (string & {})` preserves literal-type hints in IDE autocomplete
 * (suggesting known HTML tag names) while still accepting any arbitrary string.
 * Framework adapters narrow this further — e.g. React adds `React.ComponentType`.
 */
export type ElementType = IntrinsicTag | (string & {})

/**
 * A valid HTML tag name. Used as the key type for `TagMap` lookups and as the
 * argument type for ARIA role and implicit-role resolution.
 */
export type IntrinsicTag = keyof HTMLElementTagNameMap

import type { AriaRole } from './aria-role'
export type { AriaRole, KnownAriaRole } from './aria-role'

/**
 * Props for an intrinsic HTML element. `role` is explicitly typed as the
 * only known key; all other props remain open via the index signature.
 */
export type IntrinsicProps = Record<string, unknown> & { role?: AriaRole }

/**
 * Narrowed form of `IntrinsicProps` after a `hasRole` check — guarantees
 * `role` is a non-empty string. Used as the pipeline entry condition.
 * Shallow-readonly so callers cannot mutate props passed into the engine.
 */
export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>

/**
 * Maps rendered HTML tag names to additional CSS class strings.
 *
 * When a component renders as a tag that matches a key, the mapped class is
 * appended after the base class. Values are CSS classes, not tag names.
 * Accepts both known intrinsic tags and arbitrary string keys.
 */
export type TagMap = Partial<Record<IntrinsicTag | (string & {}), ClassName>>
