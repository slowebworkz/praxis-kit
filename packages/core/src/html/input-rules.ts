import type { AriaContext, AriaResult, AriaRule } from '../types'
import { HtmlDiagnostics, InputAccessibilityDiagnostics } from '@praxis-kit/contract'
import { HTML_INPUT_TYPES } from './spec/vocabulary/input'
import type { AttributeTypePolicy } from './spec/types'
import { INPUT_ATTRIBUTE_TYPE_POLICIES, type InputAttributeName } from './spec/attributes/input'
import { REQUIRED_READONLY_CONFLICT } from './spec/constraints/input'
import { createInputAttributeTypeRule } from './spec/validators/attribute-type-validator'
import { createMutuallyExclusiveRule } from './spec/validators/mutually-exclusive-validator'

// A `Record` keyed by the attribute-name literal union (not a `Map`) so a typo'd attribute name
// is a compile error at the call site below, rather than a lookup that can return `undefined`.
const policyByAttribute = Object.fromEntries(
  INPUT_ATTRIBUTE_TYPE_POLICIES.map((policy) => [policy.attribute, policy]),
) as unknown as Record<InputAttributeName, AttributeTypePolicy>

function policyFor(attribute: InputAttributeName): AttributeTypePolicy {
  return policyByAttribute[attribute]
}

export const supportedInputTypeRule: AriaRule = Object.assign(
  ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || typeof props.type !== 'string') return []
    const type = props.type
    if (HTML_INPUT_TYPES.has(type)) return []
    const diagnostic = HtmlDiagnostics.input.unsupportedType(type)
    return [
      {
        valid: false,
        fixable: false,
        severity: diagnostic.severity,
        diagnostic,
      },
    ]
  },
  { readsProps: ['type'] as const, tags: ['input'] as const },
)

export const checkedRequiresCheckableTypeRule = createInputAttributeTypeRule(policyFor('checked'))

export const multipleRequiresSupportedTypeRule = createInputAttributeTypeRule(policyFor('multiple'))

export const maxLengthRequiresTextTypeRule = createInputAttributeTypeRule(policyFor('maxLength'))

export const minLengthRequiresTextTypeRule = createInputAttributeTypeRule(policyFor('minLength'))

export const patternRequiresTextTypeRule = createInputAttributeTypeRule(policyFor('pattern'))

export const minRequiresNumericTypeRule = createInputAttributeTypeRule(policyFor('min'))

export const maxRequiresNumericTypeRule = createInputAttributeTypeRule(policyFor('max'))

export const stepRequiresNumericTypeRule = createInputAttributeTypeRule(policyFor('step'))

export const acceptRequiresFileTypeRule = createInputAttributeTypeRule(policyFor('accept'))

export const captureRequiresFileTypeRule = createInputAttributeTypeRule(policyFor('capture'))

// ─── Layer 2: accessibility best practices (legal HTML, still worth flagging) ────────────────

// `hidden` inputs are never in the accessibility tree, so they need no accessible name — this is
// the one type this rule doesn't apply to. Associated `<label for="…">` can't be checked here: a
// single-element `AriaContext` has no visibility into sibling elements elsewhere in the tree.
export const inputAccessibleNameRule: AriaRule = Object.assign(
  ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || props.type === 'hidden') return []
    if ('aria-label' in props || 'aria-labelledby' in props) return []
    const hasPlaceholder = typeof props.placeholder === 'string' && props.placeholder.length > 0
    const diagnostic = hasPlaceholder
      ? InputAccessibilityDiagnostics.placeholderIsNotLabel()
      : InputAccessibilityDiagnostics.missingAccessibleName()
    return [{ valid: false, fixable: false, severity: diagnostic.severity, diagnostic }]
  },
  {
    readsProps: ['type', 'aria-label', 'aria-labelledby', 'placeholder'] as const,
    tags: ['input'] as const,
  },
)

const PASSWORD_AUTOCOMPLETE_VALUES = ['current-password', 'new-password'] as const

export const passwordAutocompleteRule: AriaRule = Object.assign(
  ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || props.type !== 'password') return []
    const autoComplete = props.autoComplete
    const tokens = typeof autoComplete === 'string' ? autoComplete.split(' ') : []
    if (PASSWORD_AUTOCOMPLETE_VALUES.some((value) => tokens.includes(value))) return []
    const diagnostic = InputAccessibilityDiagnostics.passwordMissingAutocomplete()
    return [{ valid: false, fixable: false, severity: diagnostic.severity, diagnostic }]
  },
  { readsProps: ['type', 'autoComplete'] as const, tags: ['input'] as const },
)

// Legal HTML (readOnly wins — the field is never editable, so `required` can never be satisfied
// interactively) but almost always an unintended combination. Not auto-fixable: removing either
// attribute would be guessing which one the author meant.
export const requiredReadOnlyConflictRule = createMutuallyExclusiveRule(REQUIRED_READONLY_CONFLICT)

// Not "ARIA rules" — the first half are HTML/ARIA-in-HTML validity facts, the second half are
// accessibility best-practice advisories. Neither is ARIA-specific.
export const INPUT_RULES: readonly AriaRule[] = [
  supportedInputTypeRule,
  checkedRequiresCheckableTypeRule,
  multipleRequiresSupportedTypeRule,
  maxLengthRequiresTextTypeRule,
  minLengthRequiresTextTypeRule,
  patternRequiresTextTypeRule,
  minRequiresNumericTypeRule,
  maxRequiresNumericTypeRule,
  stepRequiresNumericTypeRule,
  acceptRequiresFileTypeRule,
  captureRequiresFileTypeRule,
  inputAccessibleNameRule,
  passwordAutocompleteRule,
  requiredReadOnlyConflictRule,
]
