import { describe, expect, it } from 'vitest'
import en from './en'
import { placeholdersIn, validateCatalog } from './validate'
import type { MessageCatalog, MessageEntry } from './types'

const ref: MessageCatalog = {
  locale: 'en',
  messages: {
    A: { message: '{tag} and {role}', rationale: 'because {role}' },
    B: {
      message: { plural: 'n', one: '{n} x', other: '{n} xs' },
      suggestions: [{ title: '{tag}', description: 'use {role}', fix: '{role}' }],
    },
  },
}

// A translation of `ref` that is faithful, for each test to damage in one place.
const faithful = (): Record<string, MessageEntry> => ({
  A: { message: '{role} und {tag}', rationale: 'weil {role}' },
  B: {
    message: { plural: 'n', one: '{n} y', other: '{n} ys' },
    suggestions: [{ title: '{tag}', description: 'nutze {role}', fix: '{role}' }],
  },
})

const check = (messages: Record<string, MessageEntry>, locale = 'de') =>
  validateCatalog({ locale, messages }, ref)

describe('placeholdersIn', () => {
  it('collects placeholders and ignores filters', () => {
    expect([...placeholdersIn('{a} {b|quote|list} {a}')].sort()).toEqual(['a', 'b'])
  })
})

describe('validateCatalog', () => {
  it('accepts the English catalog against itself', () => {
    expect(validateCatalog(en, en)).toEqual([])
  })

  it('accepts a faithful translation', () => {
    expect(check(faithful())).toEqual([])
  })

  it('reports an invalid locale', () => {
    expect(check(faithful(), 'bad locale')).toEqual([
      expect.objectContaining({ kind: 'invalid-locale' }),
    ])
  })

  it('reports missing and unknown ids', () => {
    const issues = check({ A: faithful()['A']!, Z: { message: 'z' } })
    expect(issues).toContainEqual({ kind: 'missing-id', id: 'B' })
    expect(issues).toContainEqual({ kind: 'unknown-id', id: 'Z' })
  })

  it('reports an empty message', () => {
    const messages = { ...faithful(), A: { message: '  ', rationale: 'weil {role}' } }
    expect(check(messages)).toContainEqual({ kind: 'empty-message', id: 'A', field: 'message' })
  })

  describe('per field', () => {
    it('catches a placeholder dropped from the message even though the rationale still has it', () => {
      const messages = { ...faithful(), A: { message: '{tag} nur', rationale: 'weil {role}' } }
      expect(check(messages)).toEqual([
        { kind: 'placeholder-mismatch', id: 'A', field: 'message', missing: ['role'], extra: [] },
      ])
    })

    it('catches a placeholder dropped from the rationale', () => {
      const messages = { ...faithful(), A: { message: '{role} und {tag}', rationale: 'weil' } }
      expect(check(messages)).toEqual([
        { kind: 'placeholder-mismatch', id: 'A', field: 'rationale', missing: ['role'], extra: [] },
      ])
    })

    it('catches a renamed placeholder in a suggestion', () => {
      const messages = faithful()
      messages['B'] = {
        ...messages['B']!,
        suggestions: [{ title: '{tag}', description: 'nutze {rolle}', fix: '{role}' }],
      }
      expect(check(messages)).toEqual([
        {
          kind: 'placeholder-mismatch',
          id: 'B',
          field: 'suggestions.0.description',
          missing: ['role'],
          extra: ['rolle'],
        },
      ])
    })

    it('reports a missing and an invented field', () => {
      const messages = faithful()
      messages['A'] = { message: '{role} und {tag}' }
      messages['B'] = { ...messages['B']!, suggestions: [] }
      const issues = check(messages)
      expect(issues).toContainEqual({ kind: 'missing-field', id: 'A', field: 'rationale' })
      expect(issues).toContainEqual({
        kind: 'missing-field',
        id: 'B',
        field: 'suggestions.0.title',
      })
      expect(
        check({ ...faithful(), A: { ...faithful()['A']!, suggestions: [{ title: 't' }] } }),
      ).toContainEqual({ kind: 'unknown-field', id: 'A', field: 'suggestions.0.title' })
    })
  })

  describe('per plural form', () => {
    const withMessage = (message: MessageEntry['message']) => ({
      ...faithful(),
      B: { ...faithful()['B']!, message },
    })

    it('catches a plural form that omits the count even though another form has it', () => {
      const issues = check(withMessage({ plural: 'n', one: '{n} y', other: 'viele ys' }))
      expect(issues).toEqual([
        {
          kind: 'placeholder-mismatch',
          id: 'B',
          field: 'message',
          form: 'other',
          missing: ['n'],
          extra: [],
        },
      ])
    })

    it('compares a locale-only form (Russian "few") with the reference "other" form', () => {
      expect(
        check(withMessage({ plural: 'n', one: '{n} y', few: '{n} ya', other: '{n} yy' }), 'ru'),
      ).toEqual([])
      expect(
        check(withMessage({ plural: 'n', one: '{n} y', few: 'ya', other: '{n} yy' }), 'ru'),
      ).toEqual([
        expect.objectContaining({ kind: 'placeholder-mismatch', field: 'message', form: 'few' }),
      ])
    })

    it('lets a language without plurals use a plain string that keeps the count', () => {
      expect(check(withMessage('{n} 個'), 'ja')).toEqual([])
      expect(check(withMessage('個'), 'ja')).toEqual([
        expect.objectContaining({ kind: 'placeholder-mismatch', field: 'message' }),
      ])
    })

    it('reports a plural that selects on a different count', () => {
      expect(check(withMessage({ plural: 'count', one: '{n} y', other: '{n} ys' }))).toEqual([
        {
          kind: 'plural-selector-mismatch',
          id: 'B',
          field: 'message',
          expected: 'n',
          actual: 'count',
        },
      ])
    })
  })

  describe('blank text', () => {
    const withMessage = (message: MessageEntry['message']) => ({
      ...faithful(),
      B: { ...faithful()['B']!, message },
    })

    it('reports a blank plural form even when another form has text', () => {
      const issues = check(withMessage({ plural: 'n', one: '{n} y', other: '' }))
      expect(issues).toContainEqual({
        kind: 'empty-message',
        id: 'B',
        field: 'message',
        form: 'other',
      })
    })

    it('reports each blank form separately', () => {
      const issues = check(withMessage({ plural: 'n', one: ' ', other: '' }))
      expect(issues.filter((i) => i.kind === 'empty-message')).toEqual([
        { kind: 'empty-message', id: 'B', field: 'message', form: 'one' },
        { kind: 'empty-message', id: 'B', field: 'message', form: 'other' },
      ])
    })

    it('reports a blank rationale or suggestion text, not just the message', () => {
      const messages = faithful()
      messages['A'] = { message: '{role} und {tag}', rationale: ' ' }
      messages['B'] = {
        ...messages['B']!,
        suggestions: [{ title: '', description: 'nutze {role}', fix: '{role}' }],
      }
      const issues = check(messages)
      expect(issues).toContainEqual({ kind: 'empty-message', id: 'A', field: 'rationale' })
      expect(issues).toContainEqual({
        kind: 'empty-message',
        id: 'B',
        field: 'suggestions.0.title',
      })
    })

    it('reports a plural template with no other form, which the renderer would fall back to', () => {
      const broken = { plural: 'n', one: '{n} y' } as unknown as MessageEntry['message']
      expect(check(withMessage(broken))).toContainEqual({
        kind: 'missing-other-form',
        id: 'B',
        field: 'message',
      })
    })
  })

  it('does not treat an inherited name as a present id', () => {
    const reference: MessageCatalog = { locale: 'en', messages: { constructor: { message: 'x' } } }
    // `constructor` is inherited by every object; only an own key counts as present.
    expect(validateCatalog({ locale: 'de', messages: {} }, reference)).toContainEqual({
      kind: 'missing-id',
      id: 'constructor',
    })
    expect(
      validateCatalog({ locale: 'de', messages: { toString: { message: 'y' } } }, ref),
    ).toContainEqual({
      kind: 'unknown-id',
      id: 'toString',
    })
  })
})
