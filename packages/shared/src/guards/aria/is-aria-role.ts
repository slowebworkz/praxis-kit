import { IMPLICIT_ROLE_RECORD, STRONG_ROLES_SET, STANDALONE_ROLES_SET } from '../../constants/aria'

type Tag = keyof typeof IMPLICIT_ROLE_RECORD

export function isStrongImplicitRole(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return STRONG_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}

export function isStandaloneTag(tag: string): boolean {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false
  return STANDALONE_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag as Tag])
}
