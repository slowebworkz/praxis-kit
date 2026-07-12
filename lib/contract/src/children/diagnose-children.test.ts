import { describe, expect, it } from 'vitest'

import type { ChildRuleInput } from '../types'
import { diagnoseChildren } from './diagnose-children'

class Flex {}
class Grid {}
class Header {}
class Footer {}

const flexEl = new Flex()
const gridEl = new Grid()
const headerEl = new Header()
const footerEl = new Footer()

const flexRule: ChildRuleInput = { name: 'flex', match: (c) => c instanceof Flex }
const gridRule: ChildRuleInput = { name: 'grid', match: (c) => c instanceof Grid }
const headerRule: ChildRuleInput = {
  name: 'header',
  match: (c) => c instanceof Header,
  position: 'first',
}
const footerRule: ChildRuleInput = {
  name: 'footer',
  match: (c) => c instanceof Footer,
  position: 'last',
}

describe('diagnoseChildren', () => {
  it('returns empty array when rules list is empty', () => {
    expect(diagnoseChildren([], [flexEl])).toEqual([])
  })

  it('returns empty array when all children satisfy their rules', () => {
    const violations = diagnoseChildren([flexRule, gridRule], [flexEl, gridEl])
    expect(violations).toEqual([])
  })

  describe('cardinality-min', () => {
    it('reports violation when required child is absent', () => {
      const rule: ChildRuleInput = {
        name: 'flex',
        match: (c) => c instanceof Flex,
        cardinality: { min: 1, max: 1 },
      }
      const violations = diagnoseChildren([rule], [])
      expect(violations).toHaveLength(1)
      expect(violations[0]).toMatchObject({ kind: 'cardinality-min', ruleName: 'flex' })
    })

    it('includes context name in the message', () => {
      const rule: ChildRuleInput = {
        name: 'flex',
        match: (c) => c instanceof Flex,
        cardinality: { min: 1, max: 1 },
      }
      const [v] = diagnoseChildren([rule], [], 'MyWidget')
      expect(v?.message).toContain('MyWidget')
    })
  })

  describe('cardinality-max', () => {
    it('reports violation when too many children match a rule', () => {
      const rule: ChildRuleInput = {
        name: 'flex',
        match: (c) => c instanceof Flex,
        cardinality: { min: 0, max: 1 },
      }
      const violations = diagnoseChildren([rule], [flexEl, new Flex()])
      expect(violations).toHaveLength(1)
      expect(violations[0]).toMatchObject({ kind: 'cardinality-max', ruleName: 'flex' })
    })
  })

  describe('position', () => {
    it('reports violation when first-positioned child is not at index 0', () => {
      const violations = diagnoseChildren([gridRule, headerRule], [gridEl, headerEl])
      const v = violations.find((x) => x.kind === 'position')
      expect(v).toMatchObject({ kind: 'position', ruleName: 'header', childIndex: 1 })
    })

    it('does not report violation when first-positioned child is at index 0', () => {
      const violations = diagnoseChildren([headerRule, gridRule], [headerEl, gridEl])
      expect(violations.filter((v) => v.kind === 'position')).toEqual([])
    })

    it('reports violation when last-positioned child is not at the final index', () => {
      const violations = diagnoseChildren([flexRule, footerRule], [footerEl, flexEl])
      const v = violations.find((x) => x.kind === 'position')
      expect(v).toMatchObject({ kind: 'position', ruleName: 'footer', childIndex: 0 })
    })

    it('does not report violation when last-positioned child is at the final index', () => {
      const violations = diagnoseChildren([flexRule, footerRule], [flexEl, footerEl])
      expect(violations.filter((v) => v.kind === 'position')).toEqual([])
    })
  })

  describe('unexpected (exclusiveChildren: true)', () => {
    it('reports violation for a child that matches no rule', () => {
      const violations = diagnoseChildren([flexRule], [flexEl, gridEl], 'Component', {
        exclusiveChildren: true,
      })
      const v = violations.find((x) => x.kind === 'unexpected')
      expect(v).toMatchObject({ kind: 'unexpected', childIndex: 1 })
    })

    it('includes the child type name in the message', () => {
      const violations = diagnoseChildren([flexRule], [gridEl], 'Component', {
        exclusiveChildren: true,
      })
      expect(violations[0]?.message).toContain('Grid')
    })
  })

  describe('open by default (no exclusiveChildren)', () => {
    it('does not report a violation for a non-text child matching no rule', () => {
      const violations = diagnoseChildren([flexRule], [flexEl, gridEl])
      expect(violations.find((x) => x.kind === 'unexpected')).toBeUndefined()
    })

    it('a required rule does not forbid other unlisted children', () => {
      const required: ChildRuleInput = {
        name: 'flex',
        match: (c) => c instanceof Flex,
        cardinality: { min: 1 },
      }
      const violations = diagnoseChildren([required], [flexEl, gridEl])
      expect(violations).toEqual([])
    })
  })

  describe('text-node handling (allowText)', () => {
    it('allows string children by default even with exclusiveChildren: true', () => {
      const violations = diagnoseChildren([flexRule], ['hello', flexEl], 'Component', {
        exclusiveChildren: true,
      })
      expect(violations.find((x) => x.kind === 'unexpected')).toBeUndefined()
    })

    it('rejects string children when allowText is false, even in open mode', () => {
      const violations = diagnoseChildren([flexRule], ['hello'], 'Component', {
        allowText: false,
      })
      expect(violations.find((x) => x.kind === 'unexpected')).toMatchObject({
        kind: 'unexpected',
        childIndex: 0,
      })
    })

    it('returns empty for empty rules when exclusiveChildren is unset (fast path)', () => {
      expect(diagnoseChildren([], ['hello', flexEl])).toEqual([])
    })

    it('rejects elements against an empty rule list when exclusiveChildren is true', () => {
      const violations = diagnoseChildren([], [flexEl], 'Component', { exclusiveChildren: true })
      expect(violations).toMatchObject([{ kind: 'unexpected' }])
    })
  })

  describe('ambiguous', () => {
    it('reports violation when a child matches more than one rule', () => {
      const catchAllRule: ChildRuleInput = {
        name: 'any',
        match: (_c: unknown): _c is object => true,
      }
      const violations = diagnoseChildren([flexRule, catchAllRule], [flexEl])
      const v = violations.find((x) => x.kind === 'ambiguous')
      expect(v).toMatchObject({ kind: 'ambiguous', childIndex: 0 })
    })

    it('names both matching rules in the message', () => {
      const catchAllRule: ChildRuleInput = {
        name: 'any',
        match: (_c: unknown): _c is object => true,
      }
      const violations = diagnoseChildren([flexRule, catchAllRule], [flexEl])
      const v = violations.find((x) => x.kind === 'ambiguous')
      expect(v?.message).toContain('"flex"')
      expect(v?.message).toContain('"any"')
    })
  })

  it('collects multiple violation kinds in a single pass', () => {
    const required: ChildRuleInput = {
      name: 'flex',
      match: (c) => c instanceof Flex,
      cardinality: { min: 1, max: 1 },
    }
    const violations = diagnoseChildren([required], [gridEl], 'Component', {
      exclusiveChildren: true,
    })
    const kinds = violations.map((v) => v.kind)
    expect(kinds).toContain('cardinality-min')
    expect(kinds).toContain('unexpected')
  })
})
