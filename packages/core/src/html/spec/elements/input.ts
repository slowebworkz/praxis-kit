import type { HtmlElementSpec } from '../types'
import { ALLOWED_INPUT_ROLES } from '../roles/input'

// WHATWG HTML §4.10.5 vocabulary for `<input type>`, grouped by shared behavior. These groupings
// are the specification fact that attribute policies (`../attributes/input.ts`) and role policies
// (`../roles/input.ts`) key off of, so they live here rather than being redefined per consumer.
export const TEXT_INPUT_TYPES = ['text', 'search', 'url', 'tel', 'email', 'password'] as const

export const NUMERIC_INPUT_TYPES = [
  'number',
  'range',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
] as const

// Every input type defined by the spec. A `type` outside this set isn't invalid HTML — the spec
// requires browsers to silently fall back to `type="text"` — but it's almost always a typo (e.g.
// "date-time", "phone") that keeps rendering and accepting text without anyone noticing. A `Set`
// expresses "is this type a member of the spec's vocabulary" — the actual question being asked —
// rather than an array scan.
export const HTML_INPUT_TYPES: ReadonlySet<string> = new Set([
  ...TEXT_INPUT_TYPES,
  ...NUMERIC_INPUT_TYPES,
  'checkbox',
  'radio',
  'file',
  'color',
  'hidden',
  'button',
  'submit',
  'reset',
  'image',
])

// `input`'s roles are keyed by `type` (an enum-like discriminator), with "text" as the fallback
// when `type` is absent — the same default the HTML spec gives an omitted `type` attribute.
export const inputElementSpec: HtmlElementSpec = {
  tag: 'input',
  allowedRoles: { kind: 'byProp', prop: 'type', map: ALLOWED_INPUT_ROLES, fallback: 'text' },
}
