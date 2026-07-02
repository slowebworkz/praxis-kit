import { describe, expect, it } from 'vitest'

import { resolveFactoryOptions } from './options'
import { diagnose } from './diagnose'
import { throwDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

class Icon {}
class Label {}

const iconEl = new Icon()
const labelEl = new Label()

describe('diagnose', () => {
  describe('classes', () => {
    it('returns base class in the final class string', () => {
      const options = resolveFactoryOptions({ styling: { base: 'btn' } })
      const result = diagnose(options, 'button', {})
      expect(result.classes.base).toBe('btn')
      expect(result.classes.final).toContain('btn')
    })

    it('includes variant class in the final class string', () => {
      const options = resolveFactoryOptions({
        styling: {
          variants: { intent: { primary: 'bg-blue', secondary: 'bg-gray' } },
        },
      })
      const result = diagnose(options, 'button', { intent: 'primary' })
      expect(result.classes.final).toContain('bg-blue')
    })

    it('traces compound variants including those that did not fire', () => {
      const options = resolveFactoryOptions({
        styling: {
          variants: { intent: { primary: 'bg-blue' }, size: { lg: 'text-lg' } },
          compounds: [{ intent: 'primary', size: 'lg', class: 'shadow' }],
        },
      })
      const result = diagnose(options, 'button', { intent: 'primary', size: 'sm' })
      expect(result.classes.compounds).toHaveLength(1)
      expect(result.classes.compounds[0]?.fired).toBe(false)
    })

    it('forwards className to the pipeline', () => {
      const options = resolveFactoryOptions({})
      const result = diagnose(options, 'div', {}, undefined, 'caller-class')
      expect(result.classes.callerClass).toBe('caller-class')
      expect(result.classes.final).toContain('caller-class')
    })
  })

  describe('aria', () => {
    it('returns empty aria violations for a valid element', () => {
      const options = resolveFactoryOptions({})
      const result = diagnose(options, 'button', {})
      expect(result.aria).toEqual([])
    })

    it('returns aria violations without throwing', () => {
      // AriaRule is a function (context) => AriaResult[]. Rules only fire when the tag
      // has an implicit ARIA role (e.g. 'nav' → 'navigation').
      const customRule = () => [
        {
          valid: false as const,
          severity: 'error' as const,
          message: 'forced failure',
          fixable: false as const,
        },
      ]
      const options = resolveFactoryOptions({
        enforcement: {
          diagnostics: throwDiagnostics,
          aria: [customRule],
        },
      })
      // diagnose() must not throw even when strict:'throw' is in options
      expect(() => diagnose(options, 'nav', {})).not.toThrow()
      const result = diagnose(options, 'nav', {})
      expect(result.aria.length).toBeGreaterThan(0)
      expect(result.aria.some((v) => v.message === 'forced failure')).toBe(true)
    })
  })

  describe('children', () => {
    it('returns empty children violations when no child rules are defined', () => {
      const options = resolveFactoryOptions({})
      const result = diagnose(options, 'div', {}, [iconEl, labelEl])
      expect(result.children).toEqual([])
    })

    it('returns children violations when children break a rule', () => {
      const options = resolveFactoryOptions({
        enforcement: {
          diagnostics: silentDiagnostics,
          children: [
            { name: 'icon', match: (c) => c instanceof Icon, cardinality: { min: 1, max: 1 } },
          ],
        },
      })
      const result = diagnose(options, 'div', {}, [])
      expect(result.children).toHaveLength(1)
      expect(result.children[0]).toMatchObject({ kind: 'cardinality-min', ruleName: 'icon' })
    })

    it('reports unexpected child without throwing', () => {
      const options = resolveFactoryOptions({
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [{ name: 'icon', match: (c) => c instanceof Icon }],
        },
      })
      expect(() => diagnose(options, 'div', {}, [labelEl])).not.toThrow()
      const result = diagnose(options, 'div', {}, [labelEl])
      expect(result.children[0]).toMatchObject({ kind: 'unexpected', childIndex: 0 })
    })
  })

  it('returns all three diagnosis fields together', () => {
    const options = resolveFactoryOptions({
      styling: { base: 'card' },
    })
    const result = diagnose(options, 'div', {}, [])
    expect(result).toHaveProperty('classes')
    expect(result).toHaveProperty('aria')
    expect(result).toHaveProperty('children')
  })
})
