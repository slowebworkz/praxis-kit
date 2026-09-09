/**
 * Regenerates `lib/primitive/src/constants/aria/aria-support.generated.json` from `aria-query`
 * — the maintained machine-readable encoding of WAI-ARIA that the a11y ecosystem
 * (`eslint-plugin-jsx-a11y`, Testing Library, …) is built on.
 *
 * The fixture is the *reference*; the hand-authored runtime tables
 * (`ROLE_RESTRICTED_ATTRIBUTES`, `REQUIRED_ARIA_PROPERTIES`, `NAME_PROHIBITED_ROLES`) are checked
 * against it by `role-restricted-attributes.spec-conformance.test.ts`. Run this only when
 * `aria-query` is bumped (Dependabot: the bump PR must include the regenerated fixture and a
 * re-review of any new drift).
 *
 * Run: node --experimental-strip-types scripts/generate-aria-support.ts
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { roles as ariaRoles } from 'aria-query'
import { KNOWN_ARIA_ROLES } from '../lib/primitive/src/constants/aria/known-aria-roles.ts'
import { GLOBAL_ARIA_ATTRIBUTES } from '../lib/primitive/src/constants/aria/global-aria-attributes.ts'

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'primitive',
  'src',
  'constants',
  'aria',
  'aria-support.generated.json',
)

const KNOWN = new Set<string>(KNOWN_ARIA_ROLES)

// Deprecated since ARIA 1.1 — aria-query still lists them as supported everywhere; praxis does
// not model them at all, so they'd be pure noise in the fixture.
const DEPRECATED_ATTRS = new Set(['aria-dropeffect', 'aria-grabbed'])

// aria-query's `prohibitedProps` is an array of names, not a keyed object.
const asNames = (v: unknown): string[] => (Array.isArray(v) ? [...v] : Object.keys(v ?? {}))

// attribute -> concrete roles that support it, role-specific only (globals + prohibited removed)
const attributeToRoles: Record<string, string[]> = {}
// role -> its WAI-ARIA required states/properties (per aria-query; can be 1.1-era, see the test)
const requiredByRole: Record<string, string[]> = {}
// role -> its prohibited states/properties (e.g. generic prohibits aria-label/labelledby)
const prohibitedByRole: Record<string, string[]> = {}

for (const roleName of KNOWN_ARIA_ROLES) {
  const def = ariaRoles.get(roleName)
  if (!def || def.abstract) continue

  const prohibited = asNames(def.prohibitedProps)
  if (prohibited.length > 0) prohibitedByRole[roleName] = [...prohibited].sort()

  const required = asNames(def.requiredProps).filter((a) => !DEPRECATED_ATTRS.has(a))
  if (required.length > 0) requiredByRole[roleName] = required.sort()

  const prohibitedSet = new Set(prohibited)
  for (const attr of Object.keys(def.props)) {
    if (GLOBAL_ARIA_ATTRIBUTES.has(attr) || prohibitedSet.has(attr) || DEPRECATED_ATTRS.has(attr)) {
      continue
    }
    ;(attributeToRoles[attr] ??= []).push(roleName)
  }
}

for (const attr of Object.keys(attributeToRoles)) {
  attributeToRoles[attr] = [...new Set(attributeToRoles[attr])].filter((r) => KNOWN.has(r)).sort()
}

const payload = {
  _source: `aria-query@${process.env.npm_package_version ?? 'see package.json'}`,
  _generatedBy: 'scripts/generate-aria-support.ts',
  _note:
    'WAI-ARIA reference data. Do not edit by hand — run the generator. attributeToRoles is role-specific (globals and prohibited attrs removed), restricted to concrete KNOWN_ARIA_ROLES.',
  attributeToRoles: Object.fromEntries(Object.entries(attributeToRoles).sort()),
  requiredByRole: Object.fromEntries(Object.entries(requiredByRole).sort()),
  prohibitedByRole: Object.fromEntries(Object.entries(prohibitedByRole).sort()),
}

writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n')
console.log(
  `aria-support: wrote ${Object.keys(attributeToRoles).length} attributes, ` +
    `${Object.keys(requiredByRole).length} roles with required props, ` +
    `${Object.keys(prohibitedByRole).length} with prohibited props`,
)
