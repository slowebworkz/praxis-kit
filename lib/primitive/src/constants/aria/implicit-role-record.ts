import type { AriaRoleName, AriaRoleNames } from './types'
import type { StringMap } from '../../types/any-record'

/**
 * A **deliberately partial** static tag→role model — not "the ARIA validator".
 *
 * HTML implicit roles fall into four kinds; this file only covers the first:
 *
 * 1. **static** — role depends on the tag alone (`nav → navigation`,
 *    `article → article`). Only these belong in `IMPLICIT_ROLE_RECORD`.
 * 2. **attribute-dependent** — role depends on an attribute value
 *    (`a` is `link` *only with* `href`; `input` per `type`, see
 *    `INPUT_TYPE_ROLE_MAP` + `getInputImplicitRole`; `img` per `alt`).
 * 3. **context-dependent** — role depends on ancestry
 *    (`section`/`form` become landmarks only when they have an accessible name;
 *    `header`/`footer` are `banner`/`contentinfo` only at the top level — see
 *    `getConditionalImplicitRole`).
 * 4. **state-/naming-dependent** — role depends on runtime state or naming.
 *
 * Entries here that are *actually* attribute-dependent (`a`, `select`, `td`,
 * `th`) are the "no attributes / defaults" case; callers that know the
 * attributes must prefer the conditional helpers. Do not add an entry whose
 * real role needs more than the tag.
 */
export const IMPLICIT_ROLE_RECORD = Object.freeze({
  // Landmarks
  article: 'article',
  aside: 'complementary',
  footer: 'contentinfo',
  header: 'banner',
  main: 'main',
  nav: 'navigation',
  // Interactive
  a: 'link',
  button: 'button',
  select: 'listbox',
  textarea: 'textbox',
  // Headings
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  // Lists
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  // Tables
  table: 'table',
  tr: 'row',
  td: 'cell',
  th: 'columnheader',
  // Structural / semantic
  dialog: 'dialog',
  fieldset: 'group',
  figure: 'figure',
  meter: 'meter',
  output: 'status',
  progress: 'progressbar',
} as const satisfies Readonly<StringMap<AriaRoleName>>)

// Maps input[type=...] to WAI-ARIA 1.2 role per HTML-AAM 1.0.
// Types absent from this map (e.g. color, date, hidden, file, password) have no
// corresponding ARIA role.
export const INPUT_TYPE_ROLE_MAP = Object.freeze({
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  number: 'spinbutton',
  search: 'searchbox',
  text: 'textbox',
  email: 'textbox',
  tel: 'textbox',
  url: 'textbox',
  button: 'button',
  submit: 'button',
  reset: 'button',
  image: 'button',
} as const satisfies Readonly<StringMap<AriaRoleName>>)

export type Tag = keyof typeof IMPLICIT_ROLE_RECORD
export type InputType = keyof typeof INPUT_TYPE_ROLE_MAP
type ImplicitRole = (typeof IMPLICIT_ROLE_RECORD)[Tag]

/**
 * Roles whose implicit assignment this library treats as **not overridable** by
 * an explicit `role` attribute (a warning, not a hard block).
 *
 * ⚠️ Standards-sensitive and currently a heuristic. The precise rules live in
 * HTML-AAM 1.0 and ARIA-in-HTML ("Document conformance requirements for use of
 * ARIA attributes"), and they are more nuanced than this flat set — e.g. some
 * landmark overrides are permitted, and `<header>`/`<footer>` are only
 * `banner`/`contentinfo` at the top level (see `getConditionalImplicitRole`).
 * Treat this list as a conservative starting point: needs a dedicated
 * spec-citation pass and its own conformance tests before it is canonical. Do
 * not widen it without both.
 */
export const STRONG_ROLES = Object.freeze([
  'main',
  'navigation',
  'complementary',
  'contentinfo',
  'banner',
] as const satisfies readonly ImplicitRole[])

export const STANDALONE_ROLES = Object.freeze([
  'article',
] as const satisfies readonly ImplicitRole[])

export const STRONG_ROLES_SET: AriaRoleNames = new Set(STRONG_ROLES)
export const STANDALONE_ROLES_SET: AriaRoleNames = new Set(STANDALONE_ROLES)
