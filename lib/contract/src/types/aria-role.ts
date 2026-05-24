export const KNOWN_ARIA_ROLES = [
  'alert',
  'alertdialog',
  'article',
  'banner',
  'button',
  'complementary',
  'contentinfo',
  'dialog',
  'form',
  'main',
  'navigation',
  'region',
  'search',
] as const

export type KnownAriaRole = (typeof KNOWN_ARIA_ROLES)[number]

export type AriaRole = KnownAriaRole | (string & {})
