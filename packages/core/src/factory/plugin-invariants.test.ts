import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { assertPluginShape, guardPipeline } from './plugin-invariants'

describe('assertPluginShape', () => {
  it('passes when result has a pipeline function', () => {
    expect(() => assertPluginShape({ pipeline: () => '' })).not.toThrow()
  })

  it('throws when result is null', () => {
    expect(() => assertPluginShape(null)).toThrow(
      "Plugin factory must return an object with a 'pipeline' function. Got: null.",
    )
  })

  it('throws when result is a primitive', () => {
    expect(() => assertPluginShape(42)).toThrow(
      "Plugin factory must return an object with a 'pipeline' function. Got: number.",
    )
  })

  it('throws when result is undefined', () => {
    expect(() => assertPluginShape(undefined)).toThrow(
      "Plugin factory must return an object with a 'pipeline' function. Got: undefined.",
    )
  })

  it('throws when pipeline field is missing', () => {
    expect(() => assertPluginShape({})).toThrow(
      "Plugin factory return value is missing a 'pipeline' function. Got pipeline: undefined.",
    )
  })

  it('throws when pipeline field is not a function', () => {
    expect(() => assertPluginShape({ pipeline: 'not-a-fn' })).toThrow(
      "Plugin factory return value is missing a 'pipeline' function. Got pipeline: string.",
    )
  })
})

describe('guardPipeline', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('passes through string return values', () => {
    const pipeline = vi.fn(() => 'btn btn--sm')
    const guarded = guardPipeline(pipeline)
    expect(guarded('button', {}, undefined, undefined)).toBe('btn btn--sm')
  })

  it('forwards all arguments to the wrapped pipeline', () => {
    const pipeline = vi.fn(() => '')
    const guarded = guardPipeline(pipeline)
    guarded('a', { href: '/' }, 'extra', 'ghost')
    expect(pipeline).toHaveBeenCalledWith('a', { href: '/' }, 'extra', 'ghost')
  })

  it('throws when pipeline returns a non-string', () => {
    const pipeline = vi.fn(() => undefined as unknown as string)
    const guarded = guardPipeline(pipeline)
    expect(() => guarded('div', {})).toThrow(
      'Plugin pipeline must return a string. Got: undefined.',
    )
  })

  it('throws when pipeline returns a number', () => {
    const pipeline = vi.fn(() => 42 as unknown as string)
    const guarded = guardPipeline(pipeline)
    expect(() => guarded('div', {})).toThrow('Plugin pipeline must return a string. Got: number.')
  })

  it('passes the pipeline through unchanged in production', () => {
    process.env.NODE_ENV = 'production'
    const pipeline = vi.fn(() => 'btn')
    const guarded = guardPipeline(pipeline)
    expect(guarded).toBe(pipeline)
  })
})
