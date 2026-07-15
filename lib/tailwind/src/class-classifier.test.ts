import { describe, expect, it } from 'vitest'

import { ClassClassifier } from './class-classifier'

import { iterate } from '@praxis-kit/primitive'

const c = new ClassClassifier()

describe('ClassClassifier — layout tokens', () => {
  it('classifies "flex" as layout flex', () => {
    expect(c.classify('flex')).toEqual({ kind: 'layout', value: 'flex', raw: 'flex' })
  })

  it('classifies "inline-flex" as layout inline-flex', () => {
    expect(c.classify('inline-flex')).toEqual({
      kind: 'layout',
      value: 'inline-flex',
      raw: 'inline-flex',
    })
  })

  it('classifies "grid" as layout grid', () => {
    expect(c.classify('grid')).toEqual({ kind: 'layout', value: 'grid', raw: 'grid' })
  })

  it('classifies "inline-grid" as layout inline-grid', () => {
    expect(c.classify('inline-grid')).toEqual({
      kind: 'layout',
      value: 'inline-grid',
      raw: 'inline-grid',
    })
  })

  it('classifies "block" as layout block', () => {
    expect(c.classify('block')).toEqual({ kind: 'layout', value: 'block', raw: 'block' })
  })

  it('classifies "inline-block" as layout inline-block', () => {
    expect(c.classify('inline-block')).toEqual({
      kind: 'layout',
      value: 'inline-block',
      raw: 'inline-block',
    })
  })

  it('classifies "inline" as layout inline', () => {
    expect(c.classify('inline')).toEqual({ kind: 'layout', value: 'inline', raw: 'inline' })
  })

  it('classifies "hidden" as layout hidden', () => {
    expect(c.classify('hidden')).toEqual({ kind: 'layout', value: 'hidden', raw: 'hidden' })
  })

  it('classifies "contents" as layout contents', () => {
    expect(c.classify('contents')).toEqual({ kind: 'layout', value: 'contents', raw: 'contents' })
  })

  it('classifies "flow-root" as layout flow-root', () => {
    expect(c.classify('flow-root')).toEqual({
      kind: 'layout',
      value: 'flow-root',
      raw: 'flow-root',
    })
  })

  it('classifies "hover:flex" as layout flex (prefix stripped)', () => {
    expect(c.classify('hover:flex')).toEqual({ kind: 'layout', value: 'flex', raw: 'hover:flex' })
  })

  it('classifies "sm:grid" as layout grid (prefix stripped)', () => {
    expect(c.classify('sm:grid')).toEqual({ kind: 'layout', value: 'grid', raw: 'sm:grid' })
  })

  it('classifies "sm:hover:inline-flex" as layout inline-flex (stacked prefixes)', () => {
    expect(c.classify('sm:hover:inline-flex')).toEqual({
      kind: 'layout',
      value: 'inline-flex',
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

  it('does not classify "gapfoo" as gap (no hyphen separator)', () => {
    expect(c.classify('gapfoo')).toEqual({ kind: 'utility', base: 'gapfoo', raw: 'gapfoo' })
  })
})

describe('ClassClassifier — shared (flex-or-grid) tokens', () => {
  it.each([
    'order-1',
    'order-first',
    'justify-center',
    'justify-between',
    'content-start',
    'items-start',
    'items-center',
    'self-end',
    'place-content-center',
    'place-items-center',
    'place-self-stretch',
  ])('classifies "%s" as shared', (token) => {
    expect(c.classify(token)).toEqual({ kind: 'shared', raw: token })
  })

  it('classifies "hover:items-start" as shared (prefix stripped)', () => {
    expect(c.classify('hover:items-start')).toEqual({ kind: 'shared', raw: 'hover:items-start' })
  })

  it.each(['justify-items-start', 'justify-self-center'])(
    'classifies "%s" as utility, not shared (grid-only)',
    (token) => {
      expect(c.classify(token)).toEqual({ kind: 'utility', base: token, raw: token })
    },
  )
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
      'inline-grid',
      'block',
      'hidden',
      'gap-4',
      'hover:flex-col',
      '[&.flex]:items-start',
    ]
    iterate.forEach(tokens, (token) => {
      expect(c.classify(token).raw).toBe(token)
    })
  })
})
