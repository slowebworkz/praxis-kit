import { describe, expect, it } from 'vitest'
import support from '../../../../../primitive/src/constants/aria/aria-support.generated.json' with { type: 'json' }
import { REQUIRED_ARIA_PROPERTIES } from './required-properties'
import { NAME_PROHIBITED_ATTRIBUTES, NAME_PROHIBITED_ROLES } from './name-prohibited'

// Cross-checks the required / prohibited role data against `aria-support.generated.json` (the
// `aria-query`-derived reference, see scripts/generate-aria-support.ts and
// docs/accessibility/html-aria-audit.md F5).

const requiredRef = support.requiredByRole as Record<string, readonly string[]>
const prohibitedRef = support.prohibitedByRole as Record<string, readonly string[]>

describe('REQUIRED_ARIA_PROPERTIES vs the reference', () => {
  // praxis's list is a deliberate, conservative WAI-ARIA 1.2 subset — `aria-query` still carries
  // a few ARIA-1.1-era requirements (e.g. combobox → aria-controls, heading → aria-level). So the
  // gate is "never demand more than the reference", not equality.
  //
  // Documented exceptions — praxis follows the WAI-ARIA 1.2 spec text where `aria-query` (5.3.2)
  // does not:
  //   spinbutton → aria-valuenow — WAI-ARIA 1.2 lists it under spinbutton's Required States and
  //   Properties; aria-query 5.3.2 has spinbutton.requiredProps empty (tracking a later draft).
  const ALLOWED_STRICTER = new Set(['spinbutton → aria-valuenow'])

  it('never requires a property the reference does not also require for that role', () => {
    const over: string[] = []
    for (const [role, attrs] of Object.entries(REQUIRED_ARIA_PROPERTIES)) {
      const ref = new Set(requiredRef[role] ?? [])
      for (const attr of attrs) {
        const pair = `${role} → ${attr}`
        if (!ref.has(attr) && !ALLOWED_STRICTER.has(pair)) over.push(pair)
      }
    }
    expect(over).toEqual([])
  })
})

describe('NAME_PROHIBITED_ROLES vs the reference', () => {
  it('prohibits aria-label / aria-labelledby on every role the reference marks Name-Prohibited', () => {
    const missing = Object.keys(prohibitedRef).filter((role) => !NAME_PROHIBITED_ROLES.has(role))
    expect(missing).toEqual([])
  })

  it('the reference prohibits exactly aria-label + aria-labelledby on those roles', () => {
    for (const [role, attrs] of Object.entries(prohibitedRef)) {
      expect([...attrs].sort(), role).toEqual([...NAME_PROHIBITED_ATTRIBUTES].sort())
    }
  })

  it('praxis adds only `none` (its synonym for `presentation`) beyond the reference list', () => {
    const extra = [...NAME_PROHIBITED_ROLES].filter((r) => !(r in prohibitedRef))
    expect(extra).toEqual(['none'])
  })
})
