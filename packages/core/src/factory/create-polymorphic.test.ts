import { describe, expect, it, vi } from 'vitest'

import { createPolymorphic } from './create-polymorphic'

// ---------------------------------------------------------------------------
// resolveTag
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveTag()', () => {
  it('returns defaultTag when no as provided', () => {
    const runtime = createPolymorphic({ tag: 'section' })
    expect(runtime.resolveTag()).toBe('section')
  })

  it('returns as when provided', () => {
    const runtime = createPolymorphic({ tag: 'div' })
    expect(runtime.resolveTag('article')).toBe('article')
  })

  it('defaults to "div" when no tag configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveTag()).toBe('div')
  })
})

// ---------------------------------------------------------------------------
// resolveProps
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveProps()', () => {
  it('returns instance props unchanged when no defaults configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveProps({ className: 'foo' })).toEqual({ className: 'foo' })
  })

  it('fills in defaults that are missing from instance props', () => {
    const runtime = createPolymorphic({ defaults: { 'data-testid': 'card' } as never })
    expect(runtime.resolveProps({})).toMatchObject({ 'data-testid': 'card' })
  })

  it('instance props override defaults', () => {
    const runtime = createPolymorphic({ defaults: { 'aria-label': 'default' } as never })
    expect(runtime.resolveProps({ 'aria-label': 'override' })).toMatchObject({
      'aria-label': 'override',
    })
  })

  it('merges both sides without mutating inputs', () => {
    const defaults = { 'data-testid': 'card' } as never
    const instance = { className: 'foo' }
    const runtime = createPolymorphic({ defaults })
    const merged = runtime.resolveProps(instance)
    expect(merged).toMatchObject({ 'data-testid': 'card', className: 'foo' })
    expect(instance).not.toHaveProperty('data-testid')
  })
})

// ---------------------------------------------------------------------------
// resolveClasses — static
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveClasses() static', () => {
  it('returns base class', () => {
    const runtime = createPolymorphic({ styling: { base: 'rounded-lg' } })
    expect(runtime.resolveClasses('div', {})).toContain('rounded-lg')
  })

  it('returns empty string when nothing configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveClasses('div', {})).toBe('')
  })

  it('appends tags class for matching tag', () => {
    const runtime = createPolymorphic({
      styling: { base: 'base', tags: { section: 'sec' } as never },
    })
    const cls = runtime.resolveClasses('section', {})
    expect(cls).toContain('base')
    expect(cls).toContain('sec')
  })

  it('appends instance className', () => {
    const runtime = createPolymorphic({ styling: { base: 'base' } })
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
    styling: {
      base: 'base',
      variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
      defaults: { size: 'sm' },
    },
  })

  it('applies defaults when no variant props provided', () => {
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
    const runtime = createPolymorphic({ tag: 'section', styling: { base: 'rounded' } })
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
    const runtime = createPolymorphic({ tag: 'button' })
    const props = { 'aria-label': 'submit' }
    expect(runtime.resolveAria('button', props).props).toMatchObject({ 'aria-label': 'submit' })
  })

  it('strips an invalid aria-* attribute for the effective role', () => {
    const runtime = createPolymorphic({ tag: 'button' })
    // aria-checked is not valid on role="button"
    const result = runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(result.props).not.toHaveProperty('aria-checked')
  })

  it('does not strip a valid role-restricted attribute', () => {
    const runtime = createPolymorphic({ tag: 'button' })
    // aria-expanded is valid on role="button"
    const result = runtime.resolveAria('button', { 'aria-expanded': 'true' })
    expect(result.props).toMatchObject({ 'aria-expanded': 'true' })
  })

  it('does not strip global aria-* attributes', () => {
    const runtime = createPolymorphic({ tag: 'button' })
    const result = runtime.resolveAria('button', { 'aria-label': 'save', 'aria-hidden': 'true' })
    expect(result.props).toMatchObject({ 'aria-label': 'save', 'aria-hidden': 'true' })
  })

  it('warns for invalid attribute when strict is "warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = createPolymorphic({ tag: 'button', enforcement: { strict: 'warn' } })
    runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('is silent for invalid attribute when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = createPolymorphic({ tag: 'button', enforcement: { strict: false } })
    runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('passes through props unchanged for a tag with no implicit role', () => {
    const runtime = createPolymorphic({ tag: 'div' })
    const props = { 'aria-checked': 'true' }
    expect(runtime.resolveAria('div', props).props).toBe(props)
  })
})

// ---------------------------------------------------------------------------
// enforcement.aria — custom rule extension
// ---------------------------------------------------------------------------

describe('createPolymorphic — enforcement.aria option', () => {
  it('custom rule fires through resolveAria() — reported as warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'custom-aria-rule',
        fixable: false as const,
      },
    ]
    const runtime = createPolymorphic({
      tag: 'nav',
      enforcement: { strict: 'warn', aria: [customRule] },
    })
    runtime.resolveAria('nav', {})
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('custom-aria-rule'))
    warn.mockRestore()
  })

  it('custom rule fix strips the targeted prop via resolveAria()', () => {
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'remove data-x',
        fixable: true as const,
        fix: {
          kind: 'removeAttribute:data-x' as const,
          apply: ({ props }: { props: Record<string, unknown> }) =>
            'data-x' in props
              ? {
                  applied: true as const,
                  next: Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'data-x')),
                  previous: props,
                }
              : { applied: false as const, next: props },
        },
      },
    ]
    const runtime = createPolymorphic({
      tag: 'nav',
      enforcement: { strict: false, aria: [customRule] },
    })
    const { props } = runtime.resolveAria('nav', { 'data-x': '1' } as never)
    expect(props).not.toHaveProperty('data-x')
  })

  it('resolveAria() behaves normally when enforcement.aria is not provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = createPolymorphic({ tag: 'button', enforcement: { strict: 'warn' } })
    const { props } = runtime.resolveAria('button', { 'aria-label': 'ok' })
    expect(props).toMatchObject({ 'aria-label': 'ok' })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
