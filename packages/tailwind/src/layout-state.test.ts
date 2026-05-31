import { describe, expect, it } from 'vitest'

import { LayoutState } from './layout-state'

describe('LayoutState — explicit mode', () => {
  it('holds the "none" mode', () => {
    expect(new LayoutState('none').mode).toBe('none')
  })

  it('holds the "flex" mode', () => {
    expect(new LayoutState('flex').mode).toBe('flex')
  })

  it('holds the "grid" mode', () => {
    expect(new LayoutState('grid').mode).toBe('grid')
  })
})

describe('LayoutState — immutability', () => {
  it('is frozen after construction', () => {
    expect(Object.isFrozen(new LayoutState('flex'))).toBe(true)
  })
})
