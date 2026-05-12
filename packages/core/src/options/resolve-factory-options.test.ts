import { describe, expect, it } from 'vitest'

import { resolveFactoryOptions } from './resolve-factory-options'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — defaults', () => {
  it('defaults defaultTag to "div"', () => {
    expect(resolveFactoryOptions({}).defaultTag).toBe('div')
  })

  it('defaults strict to false', () => {
    expect(resolveFactoryOptions({}).strict).toBe(false)
  })

  it('omits baseClassName when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('baseClassName')
  })

  it('omits defaultProps when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('defaultProps')
  })

  it('omits tagMap when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('tagMap')
  })

  it('omits variants when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('variants')
  })

  it('omits presetMap when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('presetMap')
  })

  it('works with no argument (empty default)', () => {
    expect(() => resolveFactoryOptions()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Provided options are preserved
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — provided options', () => {
  it('uses provided defaultTag', () => {
    expect(resolveFactoryOptions({ defaultTag: 'section' }).defaultTag).toBe('section')
  })

  it('uses provided strict mode', () => {
    expect(resolveFactoryOptions({ strict: 'warn' }).strict).toBe('warn')
    expect(resolveFactoryOptions({ strict: 'throw' }).strict).toBe('throw')
    expect(resolveFactoryOptions({ strict: true }).strict).toBe(true)
  })

  it('includes baseClassName when provided', () => {
    expect(resolveFactoryOptions({ baseClassName: 'rounded' }).baseClassName).toBe('rounded')
  })

  it('includes tagMap when provided', () => {
    const tagMap = { section: 'sec' }
    expect(resolveFactoryOptions({ tagMap }).tagMap).toEqual(tagMap)
  })

  it('includes defaultProps when provided', () => {
    const defaultProps = { 'data-testid': 'card' } as const
    expect(resolveFactoryOptions({ defaultProps }).defaultProps).toEqual(defaultProps)
  })

  it('includes variants when provided', () => {
    const variants = { size: { sm: 'text-sm' } }
    expect(resolveFactoryOptions({ variants }).variants).toEqual(variants)
  })

  it('includes defaultVariants when provided', () => {
    const defaultVariants = { size: 'sm' }
    expect(resolveFactoryOptions({ defaultVariants }).defaultVariants).toEqual(defaultVariants)
  })

  it('includes presetMap when provided', () => {
    const presetMap = { primary: { size: 'lg' } }
    expect(resolveFactoryOptions({ presetMap }).presetMap).toEqual(presetMap)
  })
})

// ---------------------------------------------------------------------------
// Result is frozen
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — immutability', () => {
  it('returns a frozen object', () => {
    expect(Object.isFrozen(resolveFactoryOptions({}))).toBe(true)
  })

  it('frozen object prevents mutation', () => {
    const opts = resolveFactoryOptions({ defaultTag: 'div' })
    expect(() => {
      ;(opts as Record<string, unknown>).defaultTag = 'section'
    }).toThrow()
  })
})
