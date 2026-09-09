import type { StringMap } from '@praxis-kit/primitive'

// WAI-ARIA 1.2 required states and properties, keyed by role.
// Source: https://www.w3.org/TR/wai-aria-1.2/#requiredState
//
// Intentionally partial: this is not the full WAI-ARIA required-property table. Add a role only
// once its requirement is implemented in the engine and covered by tests — a reader must not
// assume a role's absence here means "no required properties".
export const REQUIRED_ARIA_PROPERTIES: Readonly<StringMap<readonly string[]>> = {
  combobox: ['aria-expanded'],
  option: ['aria-selected'],
  slider: ['aria-valuenow'],
  scrollbar: ['aria-controls', 'aria-valuenow'],
  spinbutton: ['aria-valuenow'],
}
