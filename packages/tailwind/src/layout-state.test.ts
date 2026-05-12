import { describe, expect, it } from 'vitest'

import type { ClassifiedToken } from './types/classified-token'
import { LayoutState } from './layout-state'

const flexToken: ClassifiedToken = { kind: 'layout', value: 'flex', raw: 'flex' }
const gridToken: ClassifiedToken = { kind: 'layout', value: 'grid', raw: 'grid' }
const utilityToken: ClassifiedToken = { kind: 'utility', base: 'rounded', raw: 'rounded' }

function make(tokens: ClassifiedToken[], override?: 'flex' | 'grid') {
  return new LayoutState(tokens, override)
}

describe('LayoutState — mode from tokens (no override)', () => {
  it('mode is "none" with no tokens and no override', () => {
    expect(make([]).mode).toBe('none')
  })

  it('mode is "none" when only non-layout tokens present', () => {
    expect(make([utilityToken]).mode).toBe('none')
  })

  it('mode is "flex" when a flex layout token is present', () => {
    expect(make([flexToken]).mode).toBe('flex')
  })

  it('mode is "grid" when a grid layout token is present', () => {
    expect(make([gridToken]).mode).toBe('grid')
  })

  it('flex takes priority over grid when both tokens present', () => {
    expect(make([flexToken, gridToken]).mode).toBe('flex')
  })

  it('flex takes priority regardless of token order', () => {
    expect(make([gridToken, flexToken]).mode).toBe('flex')
  })
})

describe('LayoutState — mode from override', () => {
  it('mode is "flex" when override is "flex"', () => {
    expect(make([], 'flex').mode).toBe('flex')
  })

  it('mode is "grid" when override is "grid"', () => {
    expect(make([], 'grid').mode).toBe('grid')
  })

  it('override "flex" wins over grid tokens', () => {
    expect(make([gridToken], 'flex').mode).toBe('flex')
  })

  it('override "grid" wins over flex tokens', () => {
    expect(make([flexToken], 'grid').mode).toBe('grid')
  })

  it('override is sole source of truth when both flex and grid tokens exist', () => {
    expect(make([flexToken, gridToken], 'flex').mode).toBe('flex')
    expect(make([flexToken, gridToken], 'grid').mode).toBe('grid')
  })

  it('no override with both tokens still derives flex (not grid)', () => {
    expect(make([flexToken, gridToken]).mode).toBe('flex')
  })
})

describe('LayoutState — immutability', () => {
  it('is frozen after construction', () => {
    expect(Object.isFrozen(make([flexToken]))).toBe(true)
  })

  it('is frozen with override', () => {
    expect(Object.isFrozen(make([], 'grid'))).toBe(true)
  })
})
