import type { AttributeTypePolicy } from '../types'
import { NUMERIC_INPUT_TYPES, TEXT_INPUT_TYPES } from '../vocabulary/input'

// HTML-AAM / WHATWG facts about `<input>`: each of these attributes only does something for a
// subset of `type` values. They typecheck and render fine for any type (React/the DOM don't
// reject them), so nothing else in the pipeline catches a `<input type="checkbox" maxLength={10}>`
// -shaped bug unless a validator consumes this table. See PRAXIS-KIT-FINDINGS.md #12.
// `as const satisfies` (rather than a `readonly AttributeTypePolicy[]` annotation) keeps each
// `attribute` field a string literal instead of widening it to `string`, so `InputAttributeName`
// below can enumerate exactly these ten names — a call site referencing an attribute not in this
// table becomes a compile error instead of a runtime throw.
export const INPUT_ATTRIBUTE_TYPE_POLICIES = [
  { attribute: 'checked', allowedTypes: ['checkbox', 'radio'] },
  { attribute: 'multiple', allowedTypes: ['email', 'file'] },
  { attribute: 'maxLength', allowedTypes: TEXT_INPUT_TYPES },
  { attribute: 'minLength', allowedTypes: TEXT_INPUT_TYPES },
  { attribute: 'pattern', allowedTypes: TEXT_INPUT_TYPES },
  { attribute: 'min', allowedTypes: NUMERIC_INPUT_TYPES },
  { attribute: 'max', allowedTypes: NUMERIC_INPUT_TYPES },
  { attribute: 'step', allowedTypes: NUMERIC_INPUT_TYPES },
  { attribute: 'accept', allowedTypes: ['file'] },
  { attribute: 'capture', allowedTypes: ['file'] },
] as const satisfies readonly AttributeTypePolicy[]

export type InputAttributeName = (typeof INPUT_ATTRIBUTE_TYPE_POLICIES)[number]['attribute']
