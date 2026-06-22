import { describe, expect, it, vi } from 'vitest'
import { renderComponent } from './render-component'
import type {
  Backend,
  ComponentDefinition,
  RenderContext,
  RuntimeContext,
  TreeContext,
} from './types'

const identity = { id: 'btn-1', name: 'Button', tag: 'button' }

const definition = (): ComponentDefinition => ({
  identity,
  capabilities: {},
  metadata: {},
  diagnostics: [],
})

const tree = (): TreeContext => ({
  root: { kind: 'native', id: 'root', tag: 'button', children: [] },
  slotAssignments: new Map(),
  diagnostics: [],
})

const render = (): RenderContext => ({
  decoration: new Map(),
})

const stringBackend: Backend<string> = {
  render: (ctx) => ctx.definition.identity.name,
}

describe('renderComponent', () => {
  it('passes definition to backend via RuntimeContext', () => {
    const result = renderComponent(definition(), tree(), render(), stringBackend)
    expect(result).toBe('Button')
  })

  it('passes tree to backend via RuntimeContext', () => {
    const backend: Backend<string> = {
      render: (ctx) => {
        const root = ctx.tree.root
        return root.kind === 'native' ? root.tag : ''
      },
    }
    expect(renderComponent(definition(), tree(), render(), backend)).toBe('button')
  })

  it('passes render context to backend via RuntimeContext', () => {
    const decoration = new Map([['root', { attributes: { 'aria-label': 'close' } }]])
    const backend: Backend<string | undefined> = {
      render: (ctx) => ctx.render.decoration.get('root')?.attributes?.['aria-label'],
    }
    expect(renderComponent(definition(), tree(), { decoration }, backend)).toBe('close')
  })

  it('returns whatever the backend returns', () => {
    const backend: Backend<number> = { render: () => 42 }
    expect(renderComponent(definition(), tree(), render(), backend)).toBe(42)
  })

  it('constructs RuntimeContext with all three fields', () => {
    const received: RuntimeContext[] = []
    const backend: Backend<void> = {
      render: (ctx) => {
        received.push(ctx)
      },
    }
    const def = definition()
    const t = tree()
    const r = render()

    renderComponent(def, t, r, backend)

    expect(received).toHaveLength(1)
    expect(received[0]!.definition).toBe(def)
    expect(received[0]!.tree).toBe(t)
    expect(received[0]!.render).toBe(r)
  })

  it('different backends can coexist with different output types', () => {
    const numBackend: Backend<number> = { render: () => 1 }
    const strBackend: Backend<string> = { render: () => 'ok' }

    expect(renderComponent(definition(), tree(), render(), numBackend)).toBe(1)
    expect(renderComponent(definition(), tree(), render(), strBackend)).toBe('ok')
  })

  it('delegates to backend.render exactly once', () => {
    const spy = vi.fn(() => 'result')
    const backend: Backend<string> = { render: spy }

    renderComponent(definition(), tree(), render(), backend)

    expect(spy).toHaveBeenCalledTimes(1)
  })
})
