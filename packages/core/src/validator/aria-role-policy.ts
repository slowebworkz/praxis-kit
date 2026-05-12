import type { ImplicitRole, ImplicitTag, IntrinsicTag } from '../types'

const IMPLICIT_ROLES = [
  ['article', 'article'],
  ['aside', 'complementary'],
  ['footer', 'contentinfo'],
  ['header', 'banner'],
  ['main', 'main'],
  ['nav', 'navigation'],
] as const

type Roles = typeof IMPLICIT_ROLES
type Tag = ImplicitTag<Roles>
type Role = ImplicitRole<Roles>

const STRONG_ROLES = [
  'main',
  'navigation',
  'complementary',
  'contentinfo',
  'banner',
] as const satisfies readonly Role[]

const STANDALONE_ROLES = ['article'] as const satisfies readonly Role[]

const implicitRoles = new Map<Tag, Role>(IMPLICIT_ROLES)

const strongRoles = new Set<Role>(STRONG_ROLES)

const standaloneRoles = new Set<Role>(STANDALONE_ROLES)

export function getImplicitRole(tag: IntrinsicTag): Role | undefined {
  return implicitRoles.get(tag as Tag)
}

export function isStrongRole(role: string): role is Role {
  return strongRoles.has(role as Role)
}

export function isStandaloneRole(role: string): role is Role {
  return standaloneRoles.has(role as Role)
}

export const ariaRolePolicy = {
  getImplicitRole(tag: string): Role | null {
    return implicitRoles.get(tag as Tag) ?? null
  },
  isStrongImplicitRole(tag: string): boolean {
    const role = implicitRoles.get(tag as Tag)
    return role !== undefined && strongRoles.has(role)
  },
  isStandalone(tag: string): boolean {
    const role = implicitRoles.get(tag as Tag)
    return role !== undefined && standaloneRoles.has(role)
  },
}
