import { describe, expect, it } from 'vitest'

import { MatchValidationErrorBuilder } from './match-validation-error-builder'

const builder = new MatchValidationErrorBuilder('MyComponent')
const noCtx = new MatchValidationErrorBuilder()

// ---------------------------------------------------------------------------
// unexpectedChild()
// ---------------------------------------------------------------------------

describe('MatchValidationErrorBuilder.unexpectedChild()', () => {
  it('includes the type name', () => {
    expect(builder.unexpectedChild('Foo', 0)).toContain('Foo')
  })

  it('includes the index', () => {
    expect(builder.unexpectedChild('Foo', 3)).toContain('3')
  })

  it('describes the child as unexpected', () => {
    expect(builder.unexpectedChild('Foo', 0)).toMatch(/unexpected/i)
  })

  it('includes both name and index together', () => {
    const msg = builder.unexpectedChild('Button', 2)
    expect(msg).toContain('Button')
    expect(msg).toContain('2')
  })
})

// ---------------------------------------------------------------------------
// multipleMatches()
// ---------------------------------------------------------------------------

describe('MatchValidationErrorBuilder.multipleMatches()', () => {
  it('includes the type name', () => {
    expect(builder.multipleMatches('Bar', 1, ['ruleA', 'ruleB'])).toContain('Bar')
  })

  it('includes the index', () => {
    expect(builder.multipleMatches('Bar', 2, ['ruleA', 'ruleB'])).toContain('2')
  })

  it('quotes each rule name', () => {
    const msg = builder.multipleMatches('Bar', 0, ['alpha', 'beta'])
    expect(msg).toContain('"alpha"')
    expect(msg).toContain('"beta"')
  })

  it('joins rule names with "and"', () => {
    const msg = builder.multipleMatches('Bar', 0, ['alpha', 'beta', 'gamma'])
    expect(msg).toContain('and')
  })

  it('includes all three rule names', () => {
    const msg = builder.multipleMatches('X', 0, ['a', 'b', 'c'])
    expect(msg).toContain('"a"')
    expect(msg).toContain('"b"')
    expect(msg).toContain('"c"')
  })
})

// ---------------------------------------------------------------------------
// toError()
// ---------------------------------------------------------------------------

describe('MatchValidationErrorBuilder.toError()', () => {
  it('returns an Error instance', () => {
    expect(builder.toError(['something went wrong'])).toBeInstanceOf(Error)
  })

  it('formats multiple errors into a single message', () => {
    const error = builder.toError(['first', 'second', 'third'])
    expect(error.message).toContain('first')
    expect(error.message).toContain('second')
    expect(error.message).toContain('third')
  })

  it('prefixes context when present', () => {
    const error = builder.toError(['something went wrong'])
    expect(error.message.startsWith('MyComponent:\n')).toBe(true)
  })

  it('omits prefix when context is empty', () => {
    const error = noCtx.toError(['something went wrong'])
    expect(error.message.startsWith('MyComponent:')).toBe(false)
  })

  it('returns fallback message when no errors provided (with context)', () => {
    const error = builder.toError([])
    expect(error.message).toBe('MyComponent:\nUnknown validation error.')
  })

  it('returns fallback message when no errors provided (no context)', () => {
    const error = noCtx.toError([])
    expect(error.message).toBe('Unknown validation error.')
  })
})
