import type { AriaValueType } from '../../../types'

// Accepted value shapes for typed ARIA attributes.
// Attributes not in this map are unconstrained (arbitrary string values permitted).
export const ARIA_VALUE_TYPES: ReadonlyMap<string, AriaValueType> = new Map([
  // Boolean (true | false)
  ['aria-atomic', { kind: 'boolean' }],
  ['aria-busy', { kind: 'boolean' }],
  ['aria-disabled', { kind: 'boolean' }],
  ['aria-expanded', { kind: 'boolean' }],
  ['aria-hidden', { kind: 'boolean' }],
  ['aria-modal', { kind: 'boolean' }],
  ['aria-multiline', { kind: 'boolean' }],
  ['aria-multiselectable', { kind: 'boolean' }],
  ['aria-readonly', { kind: 'boolean' }],
  ['aria-required', { kind: 'boolean' }],
  ['aria-selected', { kind: 'boolean' }],
  // Tristate (true | false | mixed)
  ['aria-checked', { kind: 'tristate' }],
  ['aria-pressed', { kind: 'tristate' }],
  // Numeric (any finite number)
  ['aria-valuenow', { kind: 'number' }],
  ['aria-valuemin', { kind: 'number' }],
  ['aria-valuemax', { kind: 'number' }],
  // Integer with optional range
  ['aria-level', { kind: 'integer', min: 1, max: 6 }],
  ['aria-posinset', { kind: 'integer', min: 1 }],
  ['aria-setsize', { kind: 'integer', min: -1 }],
  ['aria-rowcount', { kind: 'integer', min: -1 }],
  ['aria-colcount', { kind: 'integer', min: -1 }],
  ['aria-rowindex', { kind: 'integer', min: 1 }],
  ['aria-colindex', { kind: 'integer', min: 1 }],
  ['aria-rowspan', { kind: 'integer', min: 0 }],
  ['aria-colspan', { kind: 'integer', min: 0 }],
  // Enum (specific allowed tokens)
  ['aria-autocomplete', { kind: 'enum', values: new Set(['inline', 'list', 'both', 'none']) }],
  [
    'aria-current',
    {
      kind: 'enum',
      values: new Set(['page', 'step', 'location', 'date', 'time', 'true', 'false']),
    },
  ],
  [
    'aria-haspopup',
    {
      kind: 'enum',
      values: new Set(['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog']),
    },
  ],
  ['aria-invalid', { kind: 'enum', values: new Set(['grammar', 'false', 'spelling', 'true']) }],
  ['aria-live', { kind: 'enum', values: new Set(['assertive', 'off', 'polite']) }],
  ['aria-orientation', { kind: 'enum', values: new Set(['horizontal', 'vertical', 'undefined']) }],
  ['aria-sort', { kind: 'enum', values: new Set(['ascending', 'descending', 'none', 'other']) }],
])
