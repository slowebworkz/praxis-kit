import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import {
  AnchorAccessibilityDiagnostics,
  AriaDiagnostics,
  ContractDiagnostics,
  HtmlDiagnostics,
  InputAccessibilityDiagnostics,
  SlotDiagnostics,
} from '@praxis-kit/contract'

/**
 * One representative call for every diagnostic factory, keyed by a stable name. The golden English
 * (`fixtures/english.golden.json`) was captured from these calls before the factories dropped their
 * prose, so a catalog that renders every sample back to its golden text proves the move changed no
 * English. Add a sample here when you add a factory; a test fails if one is missing.
 */
export const SAMPLES: Record<string, () => DiagnosticInput> = {
  // ── ARIA ──
  'aria.attributeInvalid': () => AriaDiagnostics.attributeInvalid('aria-foo', 'button'),
  'aria.missingLiveRegion': () => AriaDiagnostics.missingLiveRegion('status', 'polite'),
  'aria.missingAtomic': () => AriaDiagnostics.missingAtomic('log'),
  'aria.relevantInvalidTokens': () => AriaDiagnostics.relevantInvalidTokens(['foo', 'bar']),
  'aria.relevantSuperseded': () => AriaDiagnostics.relevantSuperseded(),
  'aria.missingAccessibleName': () => AriaDiagnostics.missingAccessibleName('nav'),
  'aria.nameProhibited': () => AriaDiagnostics.nameProhibited('aria-label', 'generic'),
  'aria.attributeOnPresentational': () =>
    AriaDiagnostics.attributeOnPresentational('aria-label', 'img'),
  'aria.ariaHiddenOnFocusable': () => AriaDiagnostics.ariaHiddenOnFocusable('button'),
  'aria.invalidAttributeValue.string': () =>
    AriaDiagnostics.invalidAttributeValue('aria-checked', 'yes', { kind: 'tristate' }),
  'aria.invalidAttributeValue.null': () =>
    AriaDiagnostics.invalidAttributeValue('aria-checked', null, { kind: 'tristate' }),
  'aria.invalidAttributeValue.undefined': () =>
    AriaDiagnostics.invalidAttributeValue('aria-checked', undefined, { kind: 'tristate' }),
  'aria.invalidAttributeValue.number': () =>
    AriaDiagnostics.invalidAttributeValue('aria-level', 0, { kind: 'integer', min: 1 }),
  'aria.invalidAttributeValue.boolean': () =>
    AriaDiagnostics.invalidAttributeValue('aria-hidden', 'x', { kind: 'boolean' }),
  'aria.invalidAttributeValue.enum': () =>
    AriaDiagnostics.invalidAttributeValue('aria-live', 'loud', {
      kind: 'enum',
      values: new Set(['off', 'polite', 'assertive']),
    }),
  'aria.invalidAttributeValue.finiteNumber': () =>
    AriaDiagnostics.invalidAttributeValue('aria-valuenow', 'abc', { kind: 'number' }),
  'aria.invalidAttributeValue.integer': () =>
    AriaDiagnostics.invalidAttributeValue('aria-posinset', 1.5, { kind: 'integer' }),
  'aria.invalidAttributeValue.integerMax': () =>
    AriaDiagnostics.invalidAttributeValue('aria-level', 9, { kind: 'integer', max: 6 }),
  'aria.invalidAttributeValue.integerRange': () =>
    AriaDiagnostics.invalidAttributeValue('aria-level', 0, { kind: 'integer', min: 1, max: 6 }),
  'aria.redundantAriaLevel': () => AriaDiagnostics.redundantAriaLevel('h2', 2),
  'aria.requiredProperty': () => AriaDiagnostics.requiredProperty('aria-expanded', 'combobox'),
  'aria.invalidRole': () => AriaDiagnostics.invalidRole('bogus', 'div'),
  'aria.invalidRole.undefined': () => AriaDiagnostics.invalidRole(undefined, 'div'),

  // ── Contract ──
  'contract.unexpectedChild': () => ContractDiagnostics.unexpectedChild('object', 0, '<ul>'),
  'contract.ambiguousChild': () =>
    ContractDiagnostics.ambiguousChild('Item', 1, ['a', 'b'], 'Menu'),
  'contract.cardinalityMin': () => ContractDiagnostics.cardinalityMin('item', 1, 'Menu'),
  'contract.cardinalityMax': () => ContractDiagnostics.cardinalityMax('item', 2, 'Menu'),
  'contract.positionViolation.first': () =>
    ContractDiagnostics.positionViolation('header', 'first', 2, 'Card'),
  'contract.positionViolation.last': () =>
    ContractDiagnostics.positionViolation('footer', 'last', 0, 'Card'),
  'contract.unknownVariantDim': () =>
    ContractDiagnostics.unknownVariantDim('Box', 'compound[0]', 'size'),
  'contract.unknownVariantValue': () =>
    ContractDiagnostics.unknownVariantValue('Box', 'compound[0]', 'size', 'xl', ['sm', 'md']),
  'contract.unknownRecipeKey': () => ContractDiagnostics.unknownRecipeKey('Box', 'primary'),
  'contract.invalidVariantValue': () =>
    ContractDiagnostics.invalidVariantValue('Box', 'size', 'xl'),
  'contract.allowedAsViolation': () =>
    ContractDiagnostics.allowedAsViolation('span', ['div', 'p'], 'Box'),

  // ── Slot ──
  'slot.exclusive': () => SlotDiagnostics.exclusive('Box'),
  'slot.singleChildRequired': () => SlotDiagnostics.singleChildRequired('Box', 'element'),
  'slot.singleChildExceeded': () => SlotDiagnostics.singleChildExceeded('Box', 'element', 2),
  'slot.discardedChildren.one': () => SlotDiagnostics.discardedChildren('Box', 'element', 1),
  'slot.discardedChildren.many': () => SlotDiagnostics.discardedChildren('Box', 'element', 3),
  'slot.renderFnRequired': () => SlotDiagnostics.renderFnRequired('Box', 'string'),
  'slot.allowedAsMismatch': () => SlotDiagnostics.allowedAsMismatch('Box', 'span', ['div', 'p']),

  // ── Accessibility advisories ──
  'a11y.input.missingAccessibleName': () => InputAccessibilityDiagnostics.missingAccessibleName(),
  'a11y.input.placeholderIsNotLabel': () => InputAccessibilityDiagnostics.placeholderIsNotLabel(),
  'a11y.input.passwordMissingAutocomplete': () =>
    InputAccessibilityDiagnostics.passwordMissingAutocomplete(),
  'a11y.input.requiredReadOnlyConflict': () =>
    InputAccessibilityDiagnostics.requiredReadOnlyConflict(),
  'a11y.anchor.roleButtonWithHref': () => AnchorAccessibilityDiagnostics.roleButtonWithHref(),
  'a11y.anchor.ariaDisabledInert': () => AnchorAccessibilityDiagnostics.ariaDisabledInert(),

  // ── HTML ──
  'html.emptyRole': () => HtmlDiagnostics.emptyRole('div'),
  'html.implicitRoleRedundant': () => HtmlDiagnostics.implicitRoleRedundant('nav', 'navigation'),
  'html.implicitRoleOverride': () =>
    HtmlDiagnostics.implicitRoleOverride('nav', 'navigation', 'region'),
  'html.standaloneRegionOverride': () => HtmlDiagnostics.standaloneRegionOverride('main', 'main'),
  'html.landmarkRoleOverride': () =>
    HtmlDiagnostics.landmarkRoleOverride('nav', 'navigation', 'banner'),
  'html.invalidChild': () =>
    HtmlDiagnostics.invalidChild('div', 'ul', ['<li>', '<script>', '<template>']),
  'html.invalidChild.phrasing': () => HtmlDiagnostics.invalidChild('button', 'a', 'phrasing'),
  'html.invalidChild.unspecified': () => HtmlDiagnostics.invalidChild('div', 'p', undefined),
  'html.roleNotPermitted.some': () =>
    HtmlDiagnostics.roleNotPermitted('ul', 'button', ['menu', 'listbox']),
  'html.roleNotPermitted.none': () => HtmlDiagnostics.roleNotPermitted('br', 'button', []),
  'html.input.unsupportedType': () => HtmlDiagnostics.input.unsupportedType('bogus'),
  'html.input.attributeIgnoredForType': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('size', 'number', ['text', 'search']),
  'html.input.attributeIgnoredForType.checked': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('checked', 'button', ['checkbox', 'radio']),
  'html.input.attributeIgnoredForType.multiple': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('multiple', 'button', ['email', 'file']),
  'html.input.attributeIgnoredForType.maxLength': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('maxLength', 'button', [
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
    ]),
  'html.input.attributeIgnoredForType.minLength': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('minLength', 'button', [
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
    ]),
  'html.input.attributeIgnoredForType.pattern': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('pattern', 'button', [
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
    ]),
  'html.input.attributeIgnoredForType.min': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('min', 'button', [
      'date',
      'month',
      'week',
      'time',
      'datetime-local',
      'number',
      'range',
    ]),
  'html.input.attributeIgnoredForType.max': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('max', 'button', [
      'date',
      'month',
      'week',
      'time',
      'datetime-local',
      'number',
      'range',
    ]),
  'html.input.attributeIgnoredForType.step': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('step', 'button', [
      'date',
      'month',
      'week',
      'time',
      'datetime-local',
      'number',
      'range',
    ]),
  'html.input.attributeIgnoredForType.accept': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('accept', 'button', ['file']),
  'html.input.attributeIgnoredForType.capture': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('capture', 'button', ['file']),
  'html.input.attributeIgnoredForType.alt': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('alt', 'button', ['image']),
  'html.input.attributeIgnoredForType.height': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('height', 'button', ['image']),
  'html.input.attributeIgnoredForType.width': () =>
    HtmlDiagnostics.input.attributeIgnoredForType('width', 'button', ['image']),
  'html.anchor.dangerousHref': () => HtmlDiagnostics.anchor.dangerousHref('javascript:alert(1)'),
}
