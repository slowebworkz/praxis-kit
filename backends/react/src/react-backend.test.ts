import React, { Children, Fragment } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { RuntimeContext } from '@pk2/core'
import { describe, expect, it } from 'vitest'
import { reactBackend } from './react-backend'

function props(el: ReactElement): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (el as any).props
}

function childElements(el: ReactElement): ReactElement[] {
  return Children.toArray(props(el).children as ReactNode) as ReactElement[]
}

function makeContext(overrides?: Partial<RuntimeContext>): RuntimeContext {
  return {
    definition: {
      identity: { id: 'root', name: 'Root', tag: 'div' },
      capabilities: {},
      metadata: {},
      diagnostics: [],
    },
    tree: {
      root: { kind: 'native', id: 'root', tag: 'div', children: [] },
      slotAssignments: new Map(),
      diagnostics: [],
    },
    render: { decoration: new Map() },
    ...overrides,
  }
}

describe('reactBackend', () => {
  describe('native nodes', () => {
    it('renders a single native node with the correct tag', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'span', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
      })
      const el = reactBackend.render(ctx)
      expect(el.type).toBe('span')
    })

    it('renders with no props when decoration map has no entry for the node', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'p', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
      })
      const el = reactBackend.render(ctx)
      expect(props(el)).toEqual({})
    })

    it('applies attributes from decoration', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'input', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: {
          decoration: new Map([
            ['n1', { attributes: { type: 'text', placeholder: 'Enter text' } }],
          ]),
        },
      })
      const el = reactBackend.render(ctx)
      expect(props(el).type).toBe('text')
      expect(props(el).placeholder).toBe('Enter text')
    })

    it('applies styles from decoration as a style object', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'div', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: { decoration: new Map([['n1', { styles: { color: 'red', fontSize: '16px' } }]]) },
      })
      const el = reactBackend.render(ctx)
      expect(props(el).style).toEqual({ color: 'red', fontSize: '16px' })
    })

    it('omits the style prop when styles is undefined', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'div', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: { decoration: new Map([['n1', { attributes: { id: 'foo' } }]]) },
      })
      const el = reactBackend.render(ctx)
      expect(props(el)).not.toHaveProperty('style')
    })

    it('applies event listeners from decoration', () => {
      const handler = () => {}
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'button', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: { decoration: new Map([['n1', { listeners: { onClick: handler } }]]) },
      })
      const el = reactBackend.render(ctx)
      expect(props(el).onClick).toBe(handler)
    })

    it('applies ref from decoration', () => {
      const ref = { current: null }
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'div', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: { decoration: new Map([['n1', { ref }]]) },
      })
      const el = reactBackend.render(ctx)
      expect(props(el).ref).toBe(ref)
    })

    it('omits ref prop when ref is undefined', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'div', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: { decoration: new Map([['n1', { attributes: { class: 'foo' } }]]) },
      })
      const el = reactBackend.render(ctx)
      expect(props(el)).not.toHaveProperty('ref')
    })

    it('merges all decoration fields together', () => {
      const handler = () => {}
      const ref = { current: null }
      const ctx = makeContext({
        tree: {
          root: { kind: 'native', id: 'n1', tag: 'input', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: {
          decoration: new Map([
            [
              'n1',
              {
                attributes: { type: 'checkbox' },
                styles: { display: 'none' },
                listeners: { onChange: handler },
                ref,
              },
            ],
          ]),
        },
      })
      const el = reactBackend.render(ctx)
      expect(props(el).type).toBe('checkbox')
      expect(props(el).style).toEqual({ display: 'none' })
      expect(props(el).onChange).toBe(handler)
      expect(props(el).ref).toBe(ref)
    })
  })

  describe('component nodes', () => {
    it('renders a component node as a React Fragment', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'component', id: 'c1', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
      })
      const el = reactBackend.render(ctx)
      expect(el.type).toBe(Fragment)
    })

    it('does not apply decoration to a component node', () => {
      const ctx = makeContext({
        tree: {
          root: { kind: 'component', id: 'c1', children: [] },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: { decoration: new Map([['c1', { attributes: { class: 'ignored' } }]]) },
      })
      const el = reactBackend.render(ctx)
      expect(props(el)).not.toHaveProperty('class')
    })
  })

  describe('children', () => {
    it('renders native children under a native parent', () => {
      const ctx = makeContext({
        tree: {
          root: {
            kind: 'native',
            id: 'parent',
            tag: 'ul',
            children: [
              { kind: 'native', id: 'child1', tag: 'li', children: [] },
              { kind: 'native', id: 'child2', tag: 'li', children: [] },
            ],
          },
          slotAssignments: new Map(),
          diagnostics: [],
        },
      })
      const el = reactBackend.render(ctx)
      const kids = childElements(el)
      expect(kids).toHaveLength(2)
      expect(kids[0]!.type).toBe('li')
      expect(kids[1]!.type).toBe('li')
    })

    it('renders native children inside a component fragment', () => {
      const ctx = makeContext({
        tree: {
          root: {
            kind: 'component',
            id: 'c1',
            children: [{ kind: 'native', id: 'n1', tag: 'div', children: [] }],
          },
          slotAssignments: new Map(),
          diagnostics: [],
        },
      })
      const el = reactBackend.render(ctx)
      expect(el.type).toBe(Fragment)
      const kids = childElements(el)
      expect(kids).toHaveLength(1)
      expect(kids[0]!.type).toBe('div')
    })

    it('applies decoration to nested children independently', () => {
      const ctx = makeContext({
        tree: {
          root: {
            kind: 'native',
            id: 'parent',
            tag: 'div',
            children: [{ kind: 'native', id: 'child', tag: 'span', children: [] }],
          },
          slotAssignments: new Map(),
          diagnostics: [],
        },
        render: {
          decoration: new Map([
            ['parent', { attributes: { id: 'p' } }],
            ['child', { attributes: { id: 'c' } }],
          ]),
        },
      })
      const el = reactBackend.render(ctx)
      expect(props(el).id).toBe('p')
      const kids = childElements(el)
      expect(props(kids[0]!).id).toBe('c')
    })

    it('handles deeply nested trees', () => {
      const ctx = makeContext({
        tree: {
          root: {
            kind: 'native',
            id: 'a',
            tag: 'div',
            children: [
              {
                kind: 'native',
                id: 'b',
                tag: 'section',
                children: [{ kind: 'native', id: 'c', tag: 'p', children: [] }],
              },
            ],
          },
          slotAssignments: new Map(),
          diagnostics: [],
        },
      })
      const el = reactBackend.render(ctx)
      const level1 = childElements(el)
      expect(level1[0]!.type).toBe('section')
      const level2 = childElements(level1[0]!)
      expect(level2[0]!.type).toBe('p')
    })
  })

  describe('Backend contract', () => {
    it('satisfies the Backend<ReactElement> interface', () => {
      expect(typeof reactBackend.render).toBe('function')
    })

    it('returns a ReactElement from render', () => {
      const ctx = makeContext()
      const el = reactBackend.render(ctx)
      expect(React.isValidElement(el)).toBe(true)
    })
  })
})
