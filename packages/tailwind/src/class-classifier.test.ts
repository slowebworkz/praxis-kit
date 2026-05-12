import { describe, expect, it } from 'vitest'

import { ClassClassifier } from './class-classifier'

const c = new ClassClassifier()

describe('ClassClassifier — layout tokens', () => {
  it('classifies "flex" as layout flex', () => {
    expect(c.classify('flex')).toEqual({ kind: 'layout', value: 'flex', raw: 'flex' })
  })

  it('classifies "inline-flex" as layout flex', () => {
    expect(c.classify('inline-flex')).toEqual({ kind: 'layout', value: 'flex', raw: 'inline-flex' })
  })

  it('classifies "grid" as layout grid', () => {
    expect(c.classify('grid')).toEqual({ kind: 'layout', value: 'grid', raw: 'grid' })
  })

  it('classifies "inline-grid" as layout grid', () => {
    expect(c.classify('inline-grid')).toEqual({ kind: 'layout', value: 'grid', raw: 'inline-grid' })
  })

  it('classifies "hover:flex" as layout flex (prefix stripped)', () => {
    expect(c.classify('hover:flex')).toEqual({ kind: 'layout', value: 'flex', raw: 'hover:flex' })
  })

  it('classifies "sm:grid" as layout grid (prefix stripped)', () => {
    expect(c.classify('sm:grid')).toEqual({ kind: 'layout', value: 'grid', raw: 'sm:grid' })
  })

  it('classifies "sm:hover:inline-flex" as layout flex (stacked prefixes)', () => {
    expect(c.classify('sm:hover:inline-flex')).toEqual({
      kind: 'layout',
      value: 'flex',
      raw: 'sm:hover:inline-flex',
    })
  })
})

describe('ClassClassifier — gap tokens', () => {
  it('classifies "gap" as gap', () => {
    expect(c.classify('gap')).toEqual({ kind: 'gap', raw: 'gap' })
  })

  it('classifies "gap-4" as gap', () => {
    expect(c.classify('gap-4')).toEqual({ kind: 'gap', raw: 'gap-4' })
  })

  it('classifies "gap-x-2" as gap', () => {
    expect(c.classify('gap-x-2')).toEqual({ kind: 'gap', raw: 'gap-x-2' })
  })

  it('classifies "hover:gap-4" as gap (prefix stripped)', () => {
    expect(c.classify('hover:gap-4')).toEqual({ kind: 'gap', raw: 'hover:gap-4' })
  })
})

describe('ClassClassifier — conditional tokens', () => {
  it('classifies "[&.flex]:flex-col" as conditional requires flex', () => {
    expect(c.classify('[&.flex]:flex-col')).toEqual({
      kind: 'conditional',
      requires: 'flex',
      raw: '[&.flex]:flex-col',
    })
  })

  it('classifies "[&.flex]:items-center" as conditional requires flex', () => {
    expect(c.classify('[&.flex]:items-center')).toEqual({
      kind: 'conditional',
      requires: 'flex',
      raw: '[&.flex]:items-center',
    })
  })

  it('classifies "[&.grid]:grid-cols-3" as conditional requires grid', () => {
    expect(c.classify('[&.grid]:grid-cols-3')).toEqual({
      kind: 'conditional',
      requires: 'grid',
      raw: '[&.grid]:grid-cols-3',
    })
  })
})

describe('ClassClassifier — utility tokens', () => {
  it('classifies "rounded" as utility', () => {
    expect(c.classify('rounded')).toEqual({ kind: 'utility', base: 'rounded', raw: 'rounded' })
  })

  it('classifies "flex-col" as utility (not layout)', () => {
    expect(c.classify('flex-col')).toEqual({ kind: 'utility', base: 'flex-col', raw: 'flex-col' })
  })

  it('classifies "grid-cols-3" as utility', () => {
    expect(c.classify('grid-cols-3')).toEqual({
      kind: 'utility',
      base: 'grid-cols-3',
      raw: 'grid-cols-3',
    })
  })

  it('classifies "grow" as utility', () => {
    expect(c.classify('grow')).toEqual({ kind: 'utility', base: 'grow', raw: 'grow' })
  })

  it('classifies "hover:flex-col" as utility with base "flex-col"', () => {
    expect(c.classify('hover:flex-col')).toEqual({
      kind: 'utility',
      base: 'flex-col',
      raw: 'hover:flex-col',
    })
  })

  it('classifies "data-[orientation=horizontal]:flex-row" as utility (brackets protect colon)', () => {
    const result = c.classify('data-[orientation=horizontal]:flex-row')
    expect(result.kind).toBe('utility')
    expect((result as { base: string }).base).toBe('flex-row')
  })

  it('classifies "data-[foo:bar]:grid-cols-3" as utility (colon inside brackets not a separator)', () => {
    const result = c.classify('data-[foo:bar]:grid-cols-3')
    expect(result.kind).toBe('utility')
    expect((result as { base: string }).base).toBe('grid-cols-3')
  })

  it('classifies "[&>div]:flex-row" as utility with base "flex-row"', () => {
    const result = c.classify('[&>div]:flex-row')
    expect(result.kind).toBe('utility')
    expect((result as { base: string }).base).toBe('flex-row')
  })
})

describe('ClassClassifier — raw preservation', () => {
  it('raw always equals the original token', () => {
    const tokens = [
      'flex',
      'inline-flex',
      'grid',
      'gap-4',
      'hover:flex-col',
      '[&.flex]:items-start',
    ]
    for (const token of tokens) {
      expect(c.classify(token).raw).toBe(token)
    }
  })
})
