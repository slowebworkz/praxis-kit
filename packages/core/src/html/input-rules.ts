import type { AnyRecord } from '@praxis-kit/primitive'
import type { AriaContext, AriaFix, AriaResult, AriaRule } from '../types'
import { HtmlDiagnostics, InputAccessibilityDiagnostics } from '@praxis-kit/contract'

// HTML-AAM / WHATWG facts about `<input>`: these attributes only do something for a subset of
// `type` values. They typecheck and render fine for any type (React/the DOM don't reject them),
// so nothing else in the pipeline catches a `<input type="checkbox" maxLength={10}>`-shaped bug.
// The default `type` when the attribute is absent is "text" per the HTML spec.
const DEFAULT_INPUT_TYPE = 'text'

function omit<T extends AnyRecord>(props: T, key: string): T {
  const next = { ...props } as AnyRecord
  delete next[key]
  return next as T
}

function removeAttributeFix(attribute: string): AriaFix {
  return {
    kind: `removeAttribute:${attribute}` as const,
    apply: ({ props }) => {
      if (!(attribute in props)) return { applied: false, next: props }
      return { applied: true, next: omit(props, attribute), previous: props }
    },
  }
}

// Declarative "attribute only valid for these input types" fact, generated into a scoped,
// cache-friendly `AriaRule`. See PRAXIS-KIT-FINDINGS.md #12 for the request this answers.
function inputAttributeRequiresType(attribute: string, allowedTypes: readonly string[]): AriaRule {
  const rule = ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || !(attribute in props)) return []
    const type = typeof props.type === 'string' ? props.type : DEFAULT_INPUT_TYPE
    if (allowedTypes.includes(type)) return []
    const diagnostic = HtmlDiagnostics.input.attributeIgnoredForType(attribute, type, allowedTypes)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: removeAttributeFix(attribute),
        diagnostic,
      },
    ]
  }
  return Object.assign(rule, { readsProps: ['type', attribute] as const })
}

const TEXT_INPUT_TYPES = ['text', 'search', 'url', 'tel', 'email', 'password'] as const
const NUMERIC_INPUT_TYPES = [
  'number',
  'range',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
] as const

// Every input type defined by the WHATWG HTML spec (§4.10.5). A `type` outside this set isn't
// invalid HTML — the spec requires browsers to silently fall back to `type="text"` — but it's
// almost always a typo (e.g. "date-time", "phone") that this repo's consumers won't notice
// because the input keeps rendering and accepting text. A `Set` here expresses "is this type a
// member of the spec's vocabulary" — the actual question being asked — rather than an array scan.
const HTML_INPUT_TYPES: ReadonlySet<string> = new Set([
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
  { readsProps: ['type'] as const },
)

export const checkedRequiresCheckableTypeRule = inputAttributeRequiresType('checked', [
  'checkbox',
  'radio',
])

export const multipleRequiresSupportedTypeRule = inputAttributeRequiresType('multiple', [
  'email',
  'file',
])

export const maxLengthRequiresTextTypeRule = inputAttributeRequiresType(
  'maxLength',
  TEXT_INPUT_TYPES,
)

export const minLengthRequiresTextTypeRule = inputAttributeRequiresType(
  'minLength',
  TEXT_INPUT_TYPES,
)

export const patternRequiresTextTypeRule = inputAttributeRequiresType('pattern', TEXT_INPUT_TYPES)

export const minRequiresNumericTypeRule = inputAttributeRequiresType('min', NUMERIC_INPUT_TYPES)

export const maxRequiresNumericTypeRule = inputAttributeRequiresType('max', NUMERIC_INPUT_TYPES)

export const stepRequiresNumericTypeRule = inputAttributeRequiresType('step', NUMERIC_INPUT_TYPES)

export const acceptRequiresFileTypeRule = inputAttributeRequiresType('accept', ['file'])

export const captureRequiresFileTypeRule = inputAttributeRequiresType('capture', ['file'])

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
  { readsProps: ['type', 'aria-label', 'aria-labelledby', 'placeholder'] as const },
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
  { readsProps: ['type', 'autoComplete'] as const },
)

// Legal HTML (readOnly wins — the field is never editable, so `required` can never be satisfied
// interactively) but almost always an unintended combination. Not auto-fixable: removing either
// attribute would be guessing which one the author meant.
export const requiredReadOnlyConflictRule: AriaRule = Object.assign(
  ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || !props.required || !props.readOnly) return []
    const diagnostic = InputAccessibilityDiagnostics.requiredReadOnlyConflict()
    return [{ valid: false, fixable: false, severity: diagnostic.severity, diagnostic }]
  },
  { readsProps: ['required', 'readOnly'] as const },
)

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
