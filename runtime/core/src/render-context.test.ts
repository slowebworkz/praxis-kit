import { describe, expect, it } from 'vitest'
import type { NodeDecoration, RenderContext } from './types'

describe('RenderContext', () => {
  it('holds a decoration map keyed by node id', () => {
    const context: RenderContext = {
      decoration: new Map([['btn-1', { attributes: { type: 'button' } }]]),
    }
    expect(context.decoration.get('btn-1')?.attributes?.type).toBe('button')
  })

  it('allows nodes with no decoration', () => {
    const context: RenderContext = {
      decoration: new Map(),
    }
    expect(context.decoration.size).toBe(0)
  })

  it('separates decoration from topology by node id', () => {
    const context: RenderContext = {
      decoration: new Map([
        ['btn-1', { attributes: { 'aria-label': 'Close' } }],
        ['div-1', { styles: { display: 'flex' } }],
      ]),
    }
    expect(context.decoration.get('btn-1')?.attributes?.['aria-label']).toBe('Close')
    expect(context.decoration.get('div-1')?.styles?.display).toBe('flex')
  })

  it('holds listeners without DOM assumptions', () => {
    const handler = (..._args: unknown[]) => {}
    const context: RenderContext = {
      decoration: new Map([['btn-1', { listeners: { click: handler } }]]),
    }
    expect(context.decoration.get('btn-1')?.listeners?.click).toBe(handler)
  })

  it('holds a ref as unknown', () => {
    const ref = { current: null }
    const context: RenderContext = {
      decoration: new Map([['btn-1', { ref }]]),
    }
    expect(context.decoration.get('btn-1')?.ref).toBe(ref)
  })

  it('allows multiple decorations on the same node', () => {
    const context: RenderContext = {
      decoration: new Map([
        [
          'btn-1',
          {
            attributes: { type: 'button' },
            styles: { display: 'flex' },
            listeners: { click: () => {} },
          },
        ],
      ]),
    }
    const node = context.decoration.get('btn-1')
    expect(node?.attributes?.type).toBe('button')
    expect(node?.styles?.display).toBe('flex')
    expect(node?.listeners?.click).toBeDefined()
  })

  it('different nodes can have different kinds of decoration', () => {
    const context: RenderContext = {
      decoration: new Map([
        ['btn-1', { attributes: { type: 'button' } }],
        ['div-1', { styles: { display: 'flex' } }],
      ]),
    }
    expect(context.decoration.get('btn-1')?.styles).toBeUndefined()
    expect(context.decoration.get('div-1')?.attributes).toBeUndefined()
  })

  it('decoration and topology share only NodeId', () => {
    const nodeId = 'btn-1'
    const decoration: NodeDecoration = { attributes: { type: 'button' } }
    const context: RenderContext = {
      decoration: new Map([[nodeId, decoration]]),
    }
    // The node's structure lives in TreeContext; only the id links the two
    expect(context.decoration.has(nodeId)).toBe(true)
    expect('id' in decoration).toBe(false)
    expect('kind' in decoration).toBe(false)
    expect('tag' in decoration).toBe(false)
    expect('children' in decoration).toBe(false)
  })
})
