import { describe, expect, it } from 'vitest'
import type { AttributeValue, Backend, RuntimeContext } from './types'

const context: RuntimeContext = {
  definition: {
    identity: { id: 'btn-1', name: 'Button', tag: 'button' },
    capabilities: {},
    metadata: {},
    diagnostics: [],
  },
  tree: {
    root: { kind: 'native', id: 'btn-1', tag: 'button', children: [] },
    slotAssignments: new Map(),
    diagnostics: [],
  },
  render: {
    decoration: new Map(),
  },
}

describe('Backend', () => {
  it('accepts an implementation that returns a string', () => {
    const backend: Backend<string> = {
      render: (ctx) => `${ctx.definition.identity.tag}#${ctx.tree.root.id}`,
    }
    expect(backend.render(context)).toBe('button#btn-1')
  })

  it('accepts an implementation that returns an object', () => {
    const backend: Backend<{ tag: string; id: string }> = {
      render: (ctx) => ({ tag: ctx.definition.identity.tag, id: ctx.tree.root.id }),
    }
    expect(backend.render(context)).toEqual({ tag: 'button', id: 'btn-1' })
  })

  it('output type is determined by the implementation', () => {
    const numericBackend: Backend<number> = { render: () => 42 }
    const result: number = numericBackend.render(context)
    expect(result).toBe(42)
  })

  it('receives all three runtime IRs through RuntimeContext', () => {
    const captured: RuntimeContext[] = []
    const backend: Backend<void> = {
      render: (ctx) => {
        captured.push(ctx)
      },
    }
    backend.render(context)
    expect(captured[0]?.definition).toBe(context.definition)
    expect(captured[0]?.tree).toBe(context.tree)
    expect(captured[0]?.render).toBe(context.render)
  })

  it('can access decoration from RenderContext', () => {
    const decorated: RuntimeContext = {
      ...context,
      render: {
        decoration: new Map([['btn-1', { attributes: { type: 'button' } }]]),
      },
    }
    const backend: Backend<AttributeValue | undefined> = {
      render: (ctx) => ctx.render.decoration.get('btn-1')?.attributes?.type,
    }
    expect(backend.render(decorated)).toBe('button')
  })

  it('backends consume RuntimeContext rather than individual IRs', () => {
    const backend: Backend<string> = {
      render: (ctx) => ctx.definition.identity.name,
    }
    expect(backend.render(context)).toBe('Button')
  })

  it('different backends can coexist with different output types', () => {
    const stringBackend: Backend<string> = { render: () => '<button />' }
    const jsonBackend: Backend<object> = {
      render: (ctx) => ({ type: ctx.definition.identity.tag }),
    }
    expect(stringBackend.render(context)).toBe('<button />')
    expect(jsonBackend.render(context)).toEqual({ type: 'button' })
  })
})
