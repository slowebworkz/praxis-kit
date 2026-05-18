import type { KnownAriaRole } from '../types'
import type { IntrinsicProps, PropsWithRole } from '../types'

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

const KNOWN_ARIA_ROLES_SET: ReadonlySet<string> = new Set(KNOWN_ARIA_ROLES)

/** Returns true when value is one of the known WAI-ARIA roles in the curated set. */
export function isKnownAriaRole(value: unknown): value is KnownAriaRole {
  return typeof value === 'string' && KNOWN_ARIA_ROLES_SET.has(value)
}

/** Narrows IntrinsicProps to PropsWithRole when role is any string (known or unknown). */
export function hasRole(props: IntrinsicProps): props is PropsWithRole {
  return typeof props.role === 'string'
}
