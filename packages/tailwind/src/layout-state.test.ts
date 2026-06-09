import { describe, expect, it } from 'vitest'

import { LayoutState } from './layout-state'

describe('LayoutState — mode', () => {
  it('holds the "none" mode', () => {
    expect(new LayoutState('none').mode).toBe('none')
  })

  it('holds the "flex" mode', () => {
    expect(new LayoutState('flex').mode).toBe('flex')
  })

  it('holds the "inline-flex" mode', () => {
    expect(new LayoutState('inline-flex').mode).toBe('inline-flex')
  })

  it('holds the "grid" mode', () => {
    expect(new LayoutState('grid').mode).toBe('grid')
  })

  it('holds the "inline-grid" mode', () => {
    expect(new LayoutState('inline-grid').mode).toBe('inline-grid')
  })

  it('holds the "block" mode', () => {
    expect(new LayoutState('block').mode).toBe('block')
  })

  it('holds the "hidden" mode', () => {
    expect(new LayoutState('hidden').mode).toBe('hidden')
  })
})

describe('LayoutState — family', () => {
  it('"none" mode has family "none"', () => {
    expect(new LayoutState('none').family).toBe('none')
  })

  it('"flex" mode has family "flex"', () => {
    expect(new LayoutState('flex').family).toBe('flex')
  })

  it('"inline-flex" mode has family "flex"', () => {
    expect(new LayoutState('inline-flex').family).toBe('flex')
  })

  it('"grid" mode has family "grid"', () => {
    expect(new LayoutState('grid').family).toBe('grid')
  })

  it('"inline-grid" mode has family "grid"', () => {
    expect(new LayoutState('inline-grid').family).toBe('grid')
  })

  it('"block" mode has family "none"', () => {
    expect(new LayoutState('block').family).toBe('none')
  })

  it('"hidden" mode has family "none"', () => {
    expect(new LayoutState('hidden').family).toBe('none')
  })

  it('"contents" mode has family "none"', () => {
    expect(new LayoutState('contents').family).toBe('none')
  })
})

describe('LayoutState — immutability', () => {
  it('is frozen after construction', () => {
    expect(Object.isFrozen(new LayoutState('flex'))).toBe(true)
  })
})
