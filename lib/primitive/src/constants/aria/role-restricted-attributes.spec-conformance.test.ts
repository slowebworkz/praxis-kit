import { describe, expect, it } from 'vitest'
import support from './aria-support.generated.json' with { type: 'json' }
import { ROLE_RESTRICTED_ATTRIBUTES } from './role-restricted-attributes'
import { GLOBAL_ARIA_ATTRIBUTES } from './global-aria-attributes'
import { KNOWN_ARIA_ROLES_SET } from './known-aria-roles'

// Cross-checks the hand-authored WAI-ARIA data against `aria-support.generated.json` — the
// reference derived from `aria-query` by `scripts/generate-aria-support.ts`. If `aria-query` is
// bumped, regenerate the fixture; this test then shows exactly what moved so the change can be
// reviewed. See docs/accessibility/html-aria-audit.md (F5).

const reference = support.attributeToRoles as Record<string, readonly string[]>

// `aria-dropeffect` / `aria-grabbed` are deprecated (ARIA 1.1) and modelled nowhere in praxis —
// the fixture generator already drops them, this is belt-and-braces.
const INTENTIONALLY_UNMODELLED = new Set<string>([])

describe('ROLE_RESTRICTED_ATTRIBUTES vs the aria-query reference', () => {
  it('models exactly the attributes the reference lists (no more, no fewer)', () => {
    const modelled = [...ROLE_RESTRICTED_ATTRIBUTES.keys()].sort()
    const expected = Object.keys(reference)
      .filter((a) => !INTENTIONALLY_UNMODELLED.has(a))
      .sort()
    expect(modelled).toEqual(expected)
  })

  it('each attribute maps to exactly the reference role set', () => {
    const drift: string[] = []
    for (const [attr, roles] of ROLE_RESTRICTED_ATTRIBUTES) {
      const ref = new Set(reference[attr] ?? [])
      const cur = new Set(roles)
      const over = [...cur].filter((r) => !ref.has(r)) // praxis claims, reference doesn't
      const under = [...ref].filter((r) => !cur.has(r)) // reference has, praxis omits
      if (over.length || under.length) {
        drift.push(`${attr}: +${JSON.stringify(over)} -${JSON.stringify(under)}`)
      }
    }
    expect(drift).toEqual([])
  })

  it('every role named is a concrete WAI-ARIA role', () => {
    for (const [attr, roles] of ROLE_RESTRICTED_ATTRIBUTES) {
      for (const role of roles) {
        expect(KNOWN_ARIA_ROLES_SET.has(role), `${attr} → ${role}`).toBe(true)
      }
    }
  })

  it('no modelled attribute is also global (a global attr is never role-restricted)', () => {
    for (const attr of ROLE_RESTRICTED_ATTRIBUTES.keys()) {
      expect(GLOBAL_ARIA_ATTRIBUTES.has(attr), attr).toBe(false)
    }
  })
})
