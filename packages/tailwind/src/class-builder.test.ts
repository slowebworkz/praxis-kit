import { describe, expect, it } from 'vitest'

import type { ClassifiedToken } from './types/classified-token'
import { ClassBuilder } from './class-builder'

const builder = new ClassBuilder()

function build(tokens: ClassifiedToken[]) {
  return builder.build(tokens)
}

const flex: ClassifiedToken = { kind: 'layout', value: 'flex', raw: 'flex' }
const inlineFlex: ClassifiedToken = { kind: 'layout', value: 'flex', raw: 'inline-flex' }
const grid: ClassifiedToken = { kind: 'layout', value: 'grid', raw: 'grid' }
const rounded: ClassifiedToken = { kind: 'utility', base: 'rounded', raw: 'rounded' }
const p4: ClassifiedToken = { kind: 'utility', base: 'p-4', raw: 'p-4' }
const gap4: ClassifiedToken = { kind: 'gap', raw: 'gap-4' }
const conditional: ClassifiedToken = {
  kind: 'conditional',
  requires: 'flex',
  raw: '[&.flex]:items-center',
}

describe('ClassBuilder — empty', () => {
  it('returns empty string for no tokens', () => {
    expect(build([])).toBe('')
  })
})

describe('ClassBuilder — layout tokens', () => {
  it('emits a single layout token', () => {
    expect(build([flex])).toBe('flex')
  })

  it('emits layout before utilities', () => {
    const result = build([rounded, flex])
    expect(result.indexOf('flex')).toBeLessThan(result.indexOf('rounded'))
  })

  it('sorts layout tokens alphabetically for determinism', () => {
    expect(build([inlineFlex, flex])).toBe('flex inline-flex')
  })

  it('deduplicates identical layout tokens', () => {
    expect(build([flex, flex])).toBe('flex')
  })
})

describe('ClassBuilder — normal group tokens', () => {
  it('emits utility tokens in insertion order', () => {
    expect(build([rounded, p4])).toBe('rounded p-4')
  })

  it('emits gap tokens', () => {
    expect(build([gap4])).toBe('gap-4')
  })

  it('emits conditional tokens', () => {
    expect(build([conditional])).toBe('[&.flex]:items-center')
  })

  it('deduplicates utility tokens', () => {
    expect(build([rounded, rounded])).toBe('rounded')
  })

  it('preserves order of distinct utilities after dedup', () => {
    expect(build([rounded, p4, rounded])).toBe('rounded p-4')
  })
})

describe('ClassBuilder — mixed tokens', () => {
  it('layout comes before utilities', () => {
    const result = build([rounded, p4, flex, gap4])
    expect(result).toBe('flex rounded p-4 gap-4')
  })

  it('layout sorted, utilities in order', () => {
    const result = build([p4, inlineFlex, rounded, flex, gap4])
    expect(result).toBe('flex inline-flex p-4 rounded gap-4')
  })

  it('grid comes before utilities', () => {
    expect(build([rounded, grid])).toBe('grid rounded')
  })
})
