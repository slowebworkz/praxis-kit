/**
 * Stable identifiers of the built-in HTML rule library (`HTML_ARIA_RULES`), the only rules
 * `enforcement.ruleOverrides` can target. `packages/core` asserts this list matches the rules it
 * actually registers, so a rule can't be added or renamed without updating the public key type.
 */
export const BUILTIN_HTML_RULE_IDS = [
  'html.landmark.role',
  'html.landmark.accessible-name',
  'html.role.not-permitted',
  'html.input.supported-type',
  'html.input.checked-type',
  'html.input.multiple-type',
  'html.input.maxLength-type',
  'html.input.minLength-type',
  'html.input.pattern-type',
  'html.input.min-type',
  'html.input.max-type',
  'html.input.step-type',
  'html.input.accept-type',
  'html.input.capture-type',
  'html.input.size-type',
  'html.input.alt-type',
  'html.input.height-type',
  'html.input.width-type',
  'html.input.accessible-name',
  'html.input.password-autocomplete',
  'html.input.required-readonly-conflict',
  'html.anchor.dangerous-href',
  'html.anchor.role-button-with-href',
  'html.anchor.aria-disabled-inert',
] as const
