import { describe, expect, it } from 'vitest'
import { renderEntry, renderTemplate } from './render'

describe('renderTemplate', () => {
  it('fills {name} placeholders', () => {
    expect(renderTemplate('<{tag}> has role="{role}"', { tag: 'nav', role: 'x' }, 'en')).toBe(
      '<nav> has role="x"',
    )
  })

  it('leaves a placeholder with no context value visible', () => {
    expect(renderTemplate('a {missing} b', {}, 'en')).toBe('a {missing} b')
  })

  it('renders falsy context values', () => {
    expect(renderTemplate('{a}|{b}|{c}', { a: 0, b: false, c: '' }, 'en')).toBe('0|false|')
  })

  it('quotes each item', () => {
    expect(renderTemplate('{v|quote}', { v: 'x' }, 'en')).toBe('"x"')
  })

  it('formats lists with the locale rules', () => {
    const ctx = { v: ['a', 'b', 'c'] }
    expect(renderTemplate('{v|list}', ctx, 'en')).toBe('a, b, and c')
    expect(renderTemplate('{v|list-or}', ctx, 'en')).toBe('a, b, or c')
    expect(renderTemplate('{v|list-unit}', ctx, 'en')).toBe('a, b, c')
    expect(renderTemplate('{v|quote|list-unit}', ctx, 'en')).toBe('"a", "b", "c"')
    expect(renderTemplate('{v|list}', ctx, 'de')).toBe('a, b und c')
  })

  it('joins an array with ", " when no list filter is given', () => {
    expect(renderTemplate('{v}', { v: ['a', 'b'] }, 'en')).toBe('a, b')
  })
})

describe('renderEntry', () => {
  it('picks the plural form for the locale', () => {
    const entry = { message: { plural: 'count', one: '{count} item', other: '{count} items' } }
    expect(renderEntry(entry, 'T', { count: 1 }, 'en').message).toBe('1 item')
    expect(renderEntry(entry, 'T', { count: 3 }, 'en').message).toBe('3 items')
  })

  it('uses the locale plural rules (Russian "few")', () => {
    const entry = { message: { plural: 'n', one: 'один', few: 'несколько', other: 'много' } }
    expect(renderEntry(entry, 'T', { n: 2 }, 'ru').message).toBe('несколько')
    expect(renderEntry(entry, 'T', { n: 5 }, 'ru').message).toBe('много')
  })

  it('renders rationale and suggestions, templating the fix', () => {
    const entry = {
      message: 'm',
      rationale: 'why {n}',
      suggestions: [{ title: 'fix {n}', description: 'd', fix: 'x = {n}' }],
    }
    expect(renderEntry(entry, 'T', { n: 2 }, 'en')).toEqual({
      message: 'm',
      rationale: 'why 2',
      suggestions: [{ title: 'fix 2', description: 'd', fix: 'x = 2' }],
    })
  })

  it('renders the id alone for a missing entry', () => {
    expect(renderEntry(undefined, 'HTML3004', { tag: 'nav' }, 'de').message).toBe('HTML3004')
  })
})
