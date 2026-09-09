import { describe, expect, it } from 'vitest'
import { buildRenderContext } from './build-render-context'

describe('buildRenderContext', () => {
  it('returns an empty decoration map when called with no arguments', () => {
    const ctx = buildRenderContext()
    expect(ctx.decoration.size).toBe(0)
  })

  it('returns an empty decoration map when called with an empty object', () => {
    const ctx = buildRenderContext({})
    expect(ctx.decoration.size).toBe(0)
  })

  it('converts a plain object entry to a Map entry', () => {
    const ctx = buildRenderContext({ root: { attributes: { 'aria-label': 'close' } } })
    expect(ctx.decoration.get('root')).toEqual({ attributes: { 'aria-label': 'close' } })
  })

  it('preserves multiple entries', () => {
    const ctx = buildRenderContext({
      btn: { attributes: { type: 'button' } },
      icon: { styles: { color: 'red' } },
    })
    expect(ctx.decoration.size).toBe(2)
    expect(ctx.decoration.get('btn')).toEqual({ attributes: { type: 'button' } })
    expect(ctx.decoration.get('icon')).toEqual({ styles: { color: 'red' } })
  })

  it('preserves listeners in the decoration', () => {
    const onClick = () => {}
    const ctx = buildRenderContext({ btn: { listeners: { onClick } } })
    expect(ctx.decoration.get('btn')?.listeners?.onClick).toBe(onClick)
  })

  it('preserves ref in the decoration', () => {
    const ref = { current: null }
    const ctx = buildRenderContext({ root: { ref } })
    expect(ctx.decoration.get('root')?.ref).toBe(ref)
  })

  it('decoration map is a Map instance', () => {
    const ctx = buildRenderContext({ root: { attributes: {} } })
    expect(ctx.decoration).toBeInstanceOf(Map)
    expect(ctx.decoration.size).toBe(1)
  })

  it('decoration entries are the same object references passed in', () => {
    const decoration = { attributes: { id: 'x' } }
    const ctx = buildRenderContext({ root: decoration })
    expect(ctx.decoration.get('root')).toBe(decoration)
  })

  it('preserves multiple decoration kinds on a single node', () => {
    const onClick = () => {}
    const ctx = buildRenderContext({
      btn: {
        attributes: { type: 'button' },
        styles: { color: 'red' },
        listeners: { onClick },
      },
    })
    expect(ctx.decoration.get('btn')).toEqual({
      attributes: { type: 'button' },
      styles: { color: 'red' },
      listeners: { onClick },
    })
  })
})
