import { describe, expect, it, vi } from 'vitest'

import { createClassPipeline } from '../styles'
import { createResolverPipeline } from './resolver'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pipeline = createClassPipeline({ baseClassName: 'base' })
const resolve = createResolverPipeline({ defaultTag: 'div' }, pipeline)

const pipelineWithDefaults = createClassPipeline({ baseClassName: 'base' })
const resolveWithDefaults = createResolverPipeline(
  { defaultTag: 'section', defaultProps: { 'data-testid': 'component' } },
  pipelineWithDefaults,
)

// ---------------------------------------------------------------------------
// Tag resolution
// ---------------------------------------------------------------------------

describe('createResolverPipeline — tag resolution', () => {
  it('resolves tag from defaultTag when as is not provided', () => {
    const result = resolve({ props: {} })
    expect(result.tag).toBe('div')
  })

  it('resolves tag from input.as when provided', () => {
    const result = resolve({ props: {}, as: 'article' })
    expect(result.tag).toBe('article')
  })

  it('as overrides defaultTag', () => {
    const result = resolveWithDefaults({ props: {}, as: 'nav' })
    expect(result.tag).toBe('nav')
  })
})

// ---------------------------------------------------------------------------
// Props merging
// ---------------------------------------------------------------------------

describe('createResolverPipeline — props merging', () => {
  it('returns input props when no defaultProps configured', () => {
    const result = resolve({ props: { className: 'foo' } })
    expect(result.props).toMatchObject({ className: 'foo' })
  })

  it('merges defaultProps with input props', () => {
    const result = resolveWithDefaults({ props: { className: 'foo' } })
    expect(result.props).toMatchObject({ 'data-testid': 'component', className: 'foo' })
  })

  it('input props win over defaultProps on conflict', () => {
    const result = resolveWithDefaults({ props: { 'data-testid': 'override' } })
    expect(result.props['data-testid']).toBe('override')
  })
})

// ---------------------------------------------------------------------------
// className
// ---------------------------------------------------------------------------

describe('createResolverPipeline — className', () => {
  it('includes baseClassName in className', () => {
    const result = resolve({ props: {} })
    expect(result.className).toContain('base')
  })

  it('appends input className to baseClassName', () => {
    const result = resolve({ props: {}, className: 'rounded' })
    expect(result.className).toContain('base')
    expect(result.className).toContain('rounded')
  })
})

// ---------------------------------------------------------------------------
// Children pass-through
// ---------------------------------------------------------------------------

describe('createResolverPipeline — children', () => {
  it('passes children through unchanged', () => {
    const children = ['child1', 'child2']
    const result = resolve({ props: {}, children })
    expect(result.children).toBe(children)
  })

  it('returns undefined children as-is', () => {
    const result = resolve({ props: {} })
    expect(result.children).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// ARIA validation
// ---------------------------------------------------------------------------

describe('createResolverPipeline — ARIA validation', () => {
  it('strips an invalid aria-* attribute from output props', () => {
    const navPipeline = createClassPipeline({})
    const navResolve = createResolverPipeline({ defaultTag: 'button' }, navPipeline)
    // aria-checked is not valid on role="button"
    const result = navResolve({ props: { 'aria-checked': 'true' } })
    expect(result.props).not.toHaveProperty('aria-checked')
  })

  it('passes valid aria-* attributes through unchanged', () => {
    const buttonPipeline = createClassPipeline({})
    const buttonResolve = createResolverPipeline({ defaultTag: 'button' }, buttonPipeline)
    // aria-expanded is valid on role="button"
    const result = buttonResolve({ props: { 'aria-expanded': 'false' } })
    expect(result.props).toMatchObject({ 'aria-expanded': 'false' })
  })

  it('passes global aria-* attributes through unchanged', () => {
    const buttonPipeline = createClassPipeline({})
    const buttonResolve = createResolverPipeline({ defaultTag: 'button' }, buttonPipeline)
    const result = buttonResolve({ props: { 'aria-label': 'close' } })
    expect(result.props).toMatchObject({ 'aria-label': 'close' })
  })

  it('warns for invalid attribute when strict is "warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const strictPipeline = createClassPipeline({})
    const strictResolve = createResolverPipeline(
      { defaultTag: 'button', strict: 'warn' },
      strictPipeline,
    )
    strictResolve({ props: { 'aria-checked': 'true' } })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not warn when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const silentPipeline = createClassPipeline({})
    const silentResolve = createResolverPipeline(
      { defaultTag: 'button', strict: false },
      silentPipeline,
    )
    silentResolve({ props: { 'aria-checked': 'true' } })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
