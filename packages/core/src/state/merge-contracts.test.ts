import { describe, expect, it } from 'vitest'
import { mergeContracts } from './merge-contracts'
import { silentDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'

describe('mergeContracts', () => {
  it('returns an empty object when given no contracts', () => {
    expect(mergeContracts()).toEqual({})
  })

  it('concatenates aria rules across contracts', () => {
    const ruleA = () => []
    const ruleB = () => []
    expect(mergeContracts({ aria: [ruleA] }, { aria: [ruleB] }).aria).toEqual([ruleA, ruleB])
  })

  it('concatenates the non-ARIA rules bucket across contracts', () => {
    const ruleA = () => []
    const ruleB = () => []
    expect(mergeContracts({ rules: [ruleA] }, { rules: [ruleB] }).rules).toEqual([ruleA, ruleB])
  })

  it('keeps aria and rules as separate buckets rather than merging them together', () => {
    const ariaRule = () => []
    const otherRule = () => []
    const merged = mergeContracts({ aria: [ariaRule] }, { rules: [otherRule] })
    expect(merged.aria).toEqual([ariaRule])
    expect(merged.rules).toEqual([otherRule])
  })

  it('omits rules when no contract declares it', () => {
    expect(mergeContracts({ aria: [() => []] })).not.toHaveProperty('rules')
  })

  it('concatenates children and props across contracts', () => {
    const child = { name: 'x', match: (_c: unknown): _c is unknown => true }
    const normalizer = (p: Record<string, unknown>) => p
    const merged = mergeContracts({ children: [child], props: [normalizer] }, { children: [] })
    expect(merged.children).toEqual([child])
    expect(merged.props).toEqual([normalizer])
  })

  it('takes the last-declared diagnostics and allowedAs', () => {
    const merged = mergeContracts(
      { diagnostics: silentDiagnostics, allowedAs: ['a'] },
      { diagnostics: warnDiagnostics, allowedAs: ['button'] },
    )
    expect(merged.diagnostics).toBe(warnDiagnostics)
    expect(merged.allowedAs).toEqual(['button'])
  })
})
