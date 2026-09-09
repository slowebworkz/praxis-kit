// WHATWG HTML §4.10.5 vocabulary for `<input type>`, grouped by shared behavior. These groupings
// are the specification fact that attribute policies (`../attributes/input.ts`) and role policies
// (`../roles/input.ts`) key off of, so they live here rather than being redefined per consumer.
// Kept separate from `../elements/input.ts` (the composed `HtmlElementSpec`) so that file can
// depend on both `../attributes/input.ts` and `../roles/input.ts` without a module cycle — those
// two both depend on this vocabulary.
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
