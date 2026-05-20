import { describe, expect, it, vi } from 'vitest'

import { createPolymorphic } from './create-polymorphic'

// ---------------------------------------------------------------------------
// resolveTag
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveTag()', () => {
  it('returns defaultTag when no as provided', () => {
    const runtime = createPolymorphic({ defaultTag: 'section' })
    expect(runtime.resolveTag()).toBe('section')
  })

  it('returns as when provided', () => {
    const runtime = createPolymorphic({ defaultTag: 'div' })
    expect(runtime.resolveTag('article')).toBe('article')
  })

  it('defaults to "div" when no defaultTag configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveTag()).toBe('div')
  })
})

// ---------------------------------------------------------------------------
// resolveProps
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveProps()', () => {
  it('returns instance props unchanged when no defaultProps configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveProps({ className: 'foo' })).toEqual({ className: 'foo' })
  })

  it('fills in defaultProps that are missing from instance props', () => {
    const runtime = createPolymorphic({ defaultProps: { 'data-testid': 'card' } as never })
    expect(runtime.resolveProps({})).toMatchObject({ 'data-testid': 'card' })
  })

  it('instance props override defaultProps', () => {
    const runtime = createPolymorphic({ defaultProps: { 'aria-label': 'default' } as never })
    expect(runtime.resolveProps({ 'aria-label': 'override' })).toMatchObject({
      'aria-label': 'override',
    })
  })

  it('merges both sides without mutating inputs', () => {
    const defaults = { 'data-testid': 'card' } as never
    const instance = { className: 'foo' }
    const runtime = createPolymorphic({ defaultProps: defaults })
    const merged = runtime.resolveProps(instance)
    expect(merged).toMatchObject({ 'data-testid': 'card', className: 'foo' })
    expect(instance).not.toHaveProperty('data-testid')
  })
})

// ---------------------------------------------------------------------------
// resolveClasses — static
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveClasses() static', () => {
  it('returns baseClassName', () => {
    const runtime = createPolymorphic({ baseClassName: 'rounded-lg' })
    expect(runtime.resolveClasses('div', {})).toContain('rounded-lg')
  })

  it('returns empty string when nothing configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveClasses('div', {})).toBe('')
  })

  it('appends tagMap class for matching tag', () => {
    const runtime = createPolymorphic({
      baseClassName: 'base',
      tagMap: { section: 'sec' } as never,
    })
    const cls = runtime.resolveClasses('section', {})
    expect(cls).toContain('base')
    expect(cls).toContain('sec')
  })

  it('appends instance className', () => {
    const runtime = createPolymorphic({ baseClassName: 'base' })
    const cls = runtime.resolveClasses('div', {}, 'user-class')
    expect(cls).toContain('base')
    expect(cls).toContain('user-class')
  })
})

// ---------------------------------------------------------------------------
// resolveClasses — variants
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveClasses() variants', () => {
  const runtime = createPolymorphic({
    baseClassName: 'base',
    variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    defaultVariants: { size: 'sm' },
  })

  it('applies defaultVariants when no variant props provided', () => {
    expect(runtime.resolveClasses('div', {})).toContain('text-sm')
  })

  it('applies explicit variant prop', () => {
    const cls = runtime.resolveClasses('div', { size: 'lg' })
    expect(cls).toContain('text-lg')
    expect(cls).not.toContain('text-sm')
  })
})

// ---------------------------------------------------------------------------
// options
// ---------------------------------------------------------------------------

describe('createPolymorphic — options', () => {
  it('returns the resolved options', () => {
    const runtime = createPolymorphic({ defaultTag: 'section', baseClassName: 'rounded' })
    const opts = runtime.options
    expect(opts.defaultTag).toBe('section')
    expect(opts.baseClassName).toBe('rounded')
  })

  it('options are frozen', () => {
    const runtime = createPolymorphic({})
    expect(Object.isFrozen(runtime.options)).toBe(true)
  })

  it('strict defaults to false', () => {
    expect(createPolymorphic({}).options.strict).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resolveAria
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveAria()', () => {
  it('returns props unchanged when all aria-* attrs are valid', () => {
    const runtime = createPolymorphic({ defaultTag: 'button' })
    const props = { 'aria-label': 'submit' }
    expect(runtime.resolveAria('button', props).props).toMatchObject({ 'aria-label': 'submit' })
  })

  it('strips an invalid aria-* attribute for the effective role', () => {
    const runtime = createPolymorphic({ defaultTag: 'button' })
    // aria-checked is not valid on role="button"
    const result = runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(result.props).not.toHaveProperty('aria-checked')
  })

  it('does not strip a valid role-restricted attribute', () => {
    const runtime = createPolymorphic({ defaultTag: 'button' })
    // aria-expanded is valid on role="button"
    const result = runtime.resolveAria('button', { 'aria-expanded': 'true' })
    expect(result.props).toMatchObject({ 'aria-expanded': 'true' })
  })

  it('does not strip global aria-* attributes', () => {
    const runtime = createPolymorphic({ defaultTag: 'button' })
    const result = runtime.resolveAria('button', { 'aria-label': 'save', 'aria-hidden': 'true' })
    expect(result.props).toMatchObject({ 'aria-label': 'save', 'aria-hidden': 'true' })
  })

  it('warns for invalid attribute when strict is "warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = createPolymorphic({ defaultTag: 'button', strict: 'warn' })
    runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('is silent for invalid attribute when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = createPolymorphic({ defaultTag: 'button', strict: false })
    runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('passes through props unchanged for a tag with no implicit role', () => {
    const runtime = createPolymorphic({ defaultTag: 'div' })
    const props = { 'aria-checked': 'true' }
    expect(runtime.resolveAria('div', props).props).toBe(props)
  })
})
