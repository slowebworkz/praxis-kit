import { describe, it, expect } from 'vitest'
import { parseSource } from './ast'
import { pruneDeadCompounds } from './compound-prune'

const CALLEE_NAMES = new Set(['createContractComponent'])

function prune(code: string): string | null {
  return pruneDeadCompounds(parseSource('test.tsx', code), CALLEE_NAMES)
}

// ---------------------------------------------------------------------------
// Fast-path: no compounds → null
// ---------------------------------------------------------------------------

describe('pruneDeadCompounds — fast path', () => {
  it('returns null when no styling.compounds present', () => {
    expect(
      prune(`
        const Btn = createContractComponent({ styling: { variants: { size: { sm: 'sm', lg: 'lg' } } } })
      `),
    ).toBeNull()
  })

  it('returns null when no factory call present', () => {
    expect(prune(`const x = 1`)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Live compounds — no pruning needed → null
// ---------------------------------------------------------------------------

describe('pruneDeadCompounds — all live', () => {
  it('returns null when all compounds are valid', () => {
    expect(
      prune(`
        const Btn = createContractComponent({
          styling: {
            variants: { size: { sm: 'sm', lg: 'lg' } },
            compounds: [{ size: 'sm', class: 'x' }, { size: 'lg', class: 'y' }],
          },
        })
      `),
    ).toBeNull()
  })

  it('returns null when compound uses an array of all-valid values', () => {
    expect(
      prune(`
        const Btn = createContractComponent({
          styling: {
            variants: { size: { sm: 'sm', lg: 'lg' } },
            compounds: [{ size: ['sm', 'lg'], class: 'x' }],
          },
        })
      `),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Dead compounds — should be pruned
// ---------------------------------------------------------------------------

describe('pruneDeadCompounds — pruning', () => {
  it('removes a compound with an unknown variant key', () => {
    const result = prune(`
      const Btn = createContractComponent({
        styling: {
          variants: { size: { sm: 'sm', lg: 'lg' } },
          compounds: [{ unknown: 'sm', class: 'dead' }, { size: 'sm', class: 'live' }],
        },
      })
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain("'dead'")
    expect(result).toContain("'live'")
  })

  it('removes a compound with an invalid string value for a known key', () => {
    const result = prune(`
      const Btn = createContractComponent({
        styling: {
          variants: { size: { sm: 'sm', lg: 'lg' } },
          compounds: [{ size: 'xl', class: 'dead' }, { size: 'sm', class: 'live' }],
        },
      })
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain("'dead'")
    expect(result).toContain("'live'")
  })

  it('removes a compound whose array value has no valid elements', () => {
    const result = prune(`
      const Btn = createContractComponent({
        styling: {
          variants: { size: { sm: 'sm', lg: 'lg' } },
          compounds: [{ size: ['xl', 'xxl'], class: 'dead' }, { size: 'sm', class: 'live' }],
        },
      })
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain("'dead'")
    expect(result).toContain("'live'")
  })

  it('keeps a compound whose array value has at least one valid element', () => {
    const result = prune(`
      const Btn = createContractComponent({
        styling: {
          variants: { size: { sm: 'sm', lg: 'lg' } },
          compounds: [{ size: ['xl', 'sm'], class: 'live' }],
        },
      })
    `)
    // 'sm' is valid, so the compound is NOT dead even though 'xl' is invalid
    expect(result).toBeNull()
  })

  it('preserves compounds with non-literal condition values (conservative)', () => {
    const result = prune(`
      const SIZE = 'sm'
      const Btn = createContractComponent({
        styling: {
          variants: { size: { sm: 'sm', lg: 'lg' } },
          compounds: [{ size: SIZE, class: 'x' }],
        },
      })
    `)
    // Cannot statically evaluate SIZE — leave the compound alone
    expect(result).toBeNull()
  })

  it('prunes dead but preserves live in a multi-condition compound', () => {
    const result = prune(`
      const Btn = createContractComponent({
        styling: {
          variants: { size: { sm: 'sm', lg: 'lg' }, intent: { ghost: 'g', solid: 's' } },
          compounds: [
            { size: 'xl', intent: 'ghost', class: 'dead' },
            { size: 'lg', intent: 'ghost', class: 'live' },
          ],
        },
      })
    `)
    expect(result).not.toBeNull()
    expect(result).not.toContain("'dead'")
    expect(result).toContain("'live'")
  })
})

// ---------------------------------------------------------------------------
// Does not crash on edge cases
// ---------------------------------------------------------------------------

describe('pruneDeadCompounds — edge cases', () => {
  it('does not crash when compounds array is empty', () => {
    expect(() =>
      prune(`
        const Btn = createContractComponent({
          styling: {
            variants: { size: { sm: 'sm' } },
            compounds: [],
          },
        })
      `),
    ).not.toThrow()
  })

  it('does not crash when styling has no variants', () => {
    expect(() =>
      prune(`
        const Btn = createContractComponent({
          styling: {
            compounds: [{ size: 'sm', class: 'x' }],
          },
        })
      `),
    ).not.toThrow()
  })
})
