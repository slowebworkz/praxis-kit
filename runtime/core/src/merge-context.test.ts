import { describe, expect, it } from 'vitest'
import { componentMergeStrategy } from './merge-context'
import type { ComponentContext } from './types'

const empty = (): ComponentContext => ({
  identity: {},
  capabilities: {},
  metadata: {},
  diagnostics: [],
})

describe('componentMergeStrategy', () => {
  describe('identity — field accumulation', () => {
    it('accumulates identity fields from independent passes', () => {
      const a = componentMergeStrategy.merge(empty(), { identity: { name: 'Button' } })
      const b = componentMergeStrategy.merge(a, { identity: { tag: 'button' } })
      const c = componentMergeStrategy.merge(b, { identity: { id: 'btn-1' } })
      expect(c.identity).toEqual({ name: 'Button', tag: 'button', id: 'btn-1' })
    })

    it('later pass overrides a conflicting identity field', () => {
      const a = componentMergeStrategy.merge(empty(), { identity: { name: 'Button' } })
      const b = componentMergeStrategy.merge(a, { identity: { name: 'Link' } })
      expect(b.identity.name).toBe('Link')
    })
  })

  describe('capabilities — field accumulation', () => {
    it('accumulates capability flags from independent passes', () => {
      const a = componentMergeStrategy.merge(empty(), { capabilities: { interactive: true } })
      const b = componentMergeStrategy.merge(a, { capabilities: { focusable: true } })
      const c = componentMergeStrategy.merge(b, { capabilities: { formControl: true } })
      expect(c.capabilities).toEqual({ interactive: true, focusable: true, formControl: true })
    })

    it('later pass overrides a conflicting capability', () => {
      const a = componentMergeStrategy.merge(empty(), { capabilities: { interactive: true } })
      const b = componentMergeStrategy.merge(a, { capabilities: { interactive: false } })
      expect(b.capabilities['interactive']).toBe(false)
    })

    it('earlier capabilities are preserved when a later pass contributes a different key', () => {
      const a = componentMergeStrategy.merge(empty(), { capabilities: { interactive: true } })
      const b = componentMergeStrategy.merge(a, { capabilities: { focusable: true } })
      expect(b.capabilities['interactive']).toBe(true)
    })
  })

  describe('metadata — field accumulation', () => {
    it('accumulates metadata keys from independent passes', () => {
      const a = componentMergeStrategy.merge(empty(), { metadata: { role: 'button' } })
      const b = componentMergeStrategy.merge(a, { metadata: { category: 'action' } })
      const c = componentMergeStrategy.merge(b, { metadata: { icon: 'check' } })
      expect(c.metadata).toEqual({ role: 'button', category: 'action', icon: 'check' })
    })

    it('later pass overrides a conflicting metadata key', () => {
      const a = componentMergeStrategy.merge(empty(), { metadata: { role: 'button' } })
      const b = componentMergeStrategy.merge(a, { metadata: { role: 'link' } })
      expect(b.metadata['role']).toBe('link')
    })
  })

  describe('diagnostics — append', () => {
    it('appends diagnostics from multiple passes', () => {
      const a = componentMergeStrategy.merge(empty(), {
        diagnostics: [{ code: 'W001', message: 'first', severity: 'warning' }],
      })
      const b = componentMergeStrategy.merge(a, {
        diagnostics: [{ code: 'W002', message: 'second', severity: 'warning' }],
      })
      expect(b.diagnostics).toHaveLength(2)
      expect(b.diagnostics[0]!.code).toBe('W001')
      expect(b.diagnostics[1]!.code).toBe('W002')
    })

    it('preserves existing diagnostics when incoming has none', () => {
      const a = componentMergeStrategy.merge(empty(), {
        diagnostics: [{ code: 'W001', message: 'first', severity: 'warning' }],
      })
      const b = componentMergeStrategy.merge(a, { identity: { name: 'Button' } })
      expect(b.diagnostics).toHaveLength(1)
    })
  })

  describe('merge algebra', () => {
    it('identity fields can arrive in any order', () => {
      const passes = [
        { identity: { id: 'btn-1' } },
        { identity: { tag: 'button' } },
        { identity: { name: 'Button' } },
      ] satisfies Partial<ComponentContext>[]

      const result = passes.reduce(
        (ctx, partial) => componentMergeStrategy.merge(ctx, partial),
        empty(),
      )

      expect(result.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
    })

    it('all four fields accumulate independently in a single pipeline', () => {
      const passes = [
        { identity: { name: 'Button' } },
        { identity: { tag: 'button' } },
        { identity: { id: 'btn-1' } },
        { capabilities: { interactive: true } },
        { capabilities: { focusable: true } },
        { metadata: { role: 'button' } },
        { metadata: { category: 'action' } },
        { diagnostics: [{ code: 'W001', message: 'a', severity: 'warning' as const }] },
        { diagnostics: [{ code: 'W002', message: 'b', severity: 'info' as const }] },
      ] satisfies Partial<ComponentContext>[]

      const result = passes.reduce(
        (ctx, partial) => componentMergeStrategy.merge(ctx, partial),
        empty(),
      )

      expect(result.identity).toEqual({ name: 'Button', tag: 'button', id: 'btn-1' })
      expect(result.capabilities).toEqual({ interactive: true, focusable: true })
      expect(result.metadata).toEqual({ role: 'button', category: 'action' })
      expect(result.diagnostics).toHaveLength(2)
    })

    it('empty incoming context leaves previous context unchanged', () => {
      const initial = componentMergeStrategy.merge(empty(), {
        identity: { name: 'Button' },
        capabilities: { interactive: true },
        metadata: { role: 'button' },
        diagnostics: [{ code: 'W001', message: 'a', severity: 'warning' }],
      })

      const result = componentMergeStrategy.merge(initial, {})

      expect(result).toEqual(initial)
    })
  })
})
