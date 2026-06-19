import { describe, expect, it } from 'vitest'

import { createClassPipeline } from './create-class-pipeline'

function resolve(pipeline: ReturnType<typeof createClassPipeline>, className = '') {
  return pipeline('div', {}, className)
}

describe('class pipeline — baseClassName', () => {
  it('includes baseClassName in output', () => {
    const pipeline = createClassPipeline({ baseClassName: 'rounded-lg' })
    expect(resolve(pipeline)).toContain('rounded-lg')
  })

  it('returns empty string when no baseClassName and no className', () => {
    const pipeline = createClassPipeline({})
    expect(resolve(pipeline)).toBe('')
  })

  it('joins baseClassName and className', () => {
    const pipeline = createClassPipeline({ baseClassName: 'base' })
    expect(resolve(pipeline, 'flex flex-col gap-4 rounded')).toBe(
      'base flex flex-col gap-4 rounded',
    )
  })
})

describe('class pipeline — tagMap', () => {
  it('applies tagMap class for matching string tag', () => {
    const pipeline = createClassPipeline({ baseClassName: 'base', tagMap: { section: 'sec' } })
    const result = pipeline('section', {}, '')
    expect(result).toContain('base')
    expect(result).toContain('sec')
  })

  it('does not apply tagMap for non-matching tag', () => {
    const pipeline = createClassPipeline({ baseClassName: 'base', tagMap: { section: 'sec' } })
    const result = pipeline('div', {}, '')
    expect(result).toContain('base')
    expect(result).not.toContain('sec')
  })

  it('skips tagMap when a recipe is provided', () => {
    const pipeline = createClassPipeline({ baseClassName: 'base', tagMap: { section: 'sec' } })
    const result = pipeline('section', {}, '', 'primary')
    expect(result).not.toContain('sec')
  })
})

describe('class pipeline — variants', () => {
  const pipeline = createClassPipeline({
    baseClassName: 'base',
    variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    defaultVariants: { size: 'sm' },
  })

  it('applies defaultVariants when no variant props provided', () => {
    expect(pipeline('div', {}, '')).toContain('text-sm')
  })

  it('applies explicit variant prop over defaultVariants', () => {
    const result = pipeline('div', { size: 'lg' }, '')
    expect(result).toContain('text-lg')
    expect(result).not.toContain('text-sm')
  })
})

describe('class pipeline — recipeMap', () => {
  const pipeline = createClassPipeline({
    baseClassName: 'base',
    tagMap: { div: 'tag-class' },
    recipeMap: { primary: { size: 'lg' } },
    variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    defaultVariants: { size: 'sm' },
  })

  it('uses preset props for variant resolution', () => {
    expect(pipeline('div', {}, '', 'primary')).toContain('text-lg')
  })

  it('skips tagMap when preset key is given', () => {
    expect(pipeline('div', {}, '', 'primary')).not.toContain('tag-class')
  })
})
