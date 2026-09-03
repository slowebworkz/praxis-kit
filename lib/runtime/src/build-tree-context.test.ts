import { describe, expect, it } from 'vitest'
import { buildTreeContext } from './build-tree-context'
import type { NodeInput } from './types/node-input'

describe('buildTreeContext', () => {
  it('builds a single native root node', () => {
    const ctx = buildTreeContext({ kind: 'native', id: 'root', tag: 'button' })
    expect(ctx.root).toEqual({ kind: 'native', id: 'root', tag: 'button', children: [] })
  })

  it('builds a single component root node', () => {
    const ctx = buildTreeContext({ kind: 'component', id: 'root' })
    expect(ctx.root).toEqual({ kind: 'component', id: 'root', children: [] })
  })

  it('preserves children recursively', () => {
    const input: NodeInput = {
      kind: 'native',
      id: 'root',
      tag: 'div',
      children: [{ kind: 'native', id: 'child', tag: 'span' }],
    }
    const ctx = buildTreeContext(input)
    expect(ctx.root.children).toHaveLength(1)
    expect(ctx.root.children[0]).toEqual({ kind: 'native', id: 'child', tag: 'span', children: [] })
  })

  it('builds deeply nested children', () => {
    const input: NodeInput = {
      kind: 'native',
      id: 'a',
      tag: 'div',
      children: [
        {
          kind: 'native',
          id: 'b',
          tag: 'ul',
          children: [{ kind: 'native', id: 'c', tag: 'li' }],
        },
      ],
    }
    const ctx = buildTreeContext(input)
    const b = ctx.root.children[0]!
    expect(b.id).toBe('b')
    expect(b.children[0]!.id).toBe('c')
  })

  it('normalizes missing children to an empty array', () => {
    const ctx = buildTreeContext({ kind: 'native', id: 'root', tag: 'div' })
    expect(ctx.root.children).toEqual([])
  })

  it('strips slot and any other input-only fields from tree nodes', () => {
    const ctx = buildTreeContext({ kind: 'native', id: 'root', tag: 'div', slot: 'trigger' })
    expect(ctx.root).toEqual({ kind: 'native', id: 'root', tag: 'div', children: [] })
  })

  it('collects slot assignment for a slotted root', () => {
    const ctx = buildTreeContext({ kind: 'native', id: 'root', tag: 'div', slot: 'trigger' })
    expect(ctx.slotAssignments.get('root')).toBe('trigger')
  })

  it('collects slot assignments from children', () => {
    const input: NodeInput = {
      kind: 'native',
      id: 'root',
      tag: 'div',
      children: [
        { kind: 'native', id: 'trigger', tag: 'button', slot: 'trigger' },
        { kind: 'native', id: 'panel', tag: 'section', slot: 'panel' },
      ],
    }
    const ctx = buildTreeContext(input)
    expect(ctx.slotAssignments.get('trigger')).toBe('trigger')
    expect(ctx.slotAssignments.get('panel')).toBe('panel')
  })

  it('does not add to slotAssignments when no slot is set', () => {
    const ctx = buildTreeContext({ kind: 'native', id: 'root', tag: 'div' })
    expect(ctx.slotAssignments.size).toBe(0)
  })

  it('collects slot assignments at mixed depths', () => {
    const input: NodeInput = {
      kind: 'native',
      id: 'root',
      tag: 'div',
      children: [
        {
          kind: 'native',
          id: 'mid',
          tag: 'span',
          children: [{ kind: 'native', id: 'deep', tag: 'button', slot: 'action' }],
        },
      ],
    }
    const ctx = buildTreeContext(input)
    expect(ctx.slotAssignments.get('deep')).toBe('action')
    expect(ctx.slotAssignments.size).toBe(1)
  })

  it('returns empty diagnostics for a valid tree', () => {
    const ctx = buildTreeContext({ kind: 'native', id: 'root', tag: 'div' })
    expect(ctx.diagnostics).toEqual([])
  })

  it('emits an error diagnostic for a duplicate node id', () => {
    const input: NodeInput = {
      kind: 'native',
      id: 'root',
      tag: 'div',
      children: [
        { kind: 'native', id: 'a', tag: 'span' },
        { kind: 'native', id: 'a', tag: 'button' },
      ],
    }
    const ctx = buildTreeContext(input)
    expect(ctx.diagnostics).toHaveLength(1)
    expect(ctx.diagnostics[0]).toMatchObject({
      code: 'duplicate-node-id',
      severity: 'error',
    })
  })

  it('still builds the full tree when a duplicate id is present', () => {
    const input: NodeInput = {
      kind: 'native',
      id: 'root',
      tag: 'div',
      children: [
        { kind: 'native', id: 'a', tag: 'span' },
        { kind: 'native', id: 'a', tag: 'button' },
      ],
    }
    const ctx = buildTreeContext(input)
    expect(ctx.root.children).toHaveLength(2)
  })

  it('handles component nodes mixed with native nodes', () => {
    const input: NodeInput = {
      kind: 'native',
      id: 'root',
      tag: 'div',
      children: [{ kind: 'component', id: 'comp', slot: 'content' }],
    }
    const ctx = buildTreeContext(input)
    expect(ctx.root.children[0]).toEqual({ kind: 'component', id: 'comp', children: [] })
    expect(ctx.slotAssignments.get('comp')).toBe('content')
  })
})
