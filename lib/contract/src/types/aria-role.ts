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
  'tab',
  'tablist',
  'tabpanel',
] as const

export type KnownAriaRole = (typeof KNOWN_ARIA_ROLES)[number]

export type AriaRole = KnownAriaRole | (string & {})

import type { IntrinsicProps, PropsWithRole } from './contract-primitives'

const KNOWN_ARIA_ROLES_SET: ReadonlySet<string> = new Set(KNOWN_ARIA_ROLES)

export function isKnownAriaRole(value: unknown): value is KnownAriaRole {
  return typeof value === 'string' && KNOWN_ARIA_ROLES_SET.has(value)
}

export function hasRole(props: IntrinsicProps): props is PropsWithRole {
  return typeof props.role === 'string'
}
