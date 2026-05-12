import { describe, expect, it } from 'vitest'

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
