// WAI-ARIA live region roles and their implied aria-live politeness values.
export const LIVE_REGION_ROLES: ReadonlyMap<string, string> = new Map([
  ['alert', 'assertive'],
  ['status', 'polite'],
  ['log', 'polite'],
  ['timer', 'off'],
])
