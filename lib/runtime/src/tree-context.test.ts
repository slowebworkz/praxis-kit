import { describe, expect, it } from 'vitest'
import type { NativeTreeNode, TreeContext } from './types'

const leaf = (id: string): NativeTreeNode => ({ kind: 'native', id, tag: 'div', children: [] })

describe('TreeContext', () => {
  it('holds a root node', () => {
    const context: TreeContext = {
      root: leaf('root'),
      slotAssignments: new Map(),
      diagnostics: [],
    }
    expect(context.root.id).toBe('root')
  })

  it('maps node ids to slot names', () => {
    const context: TreeContext = {
      root: leaf('root'),
      slotAssignments: new Map([['btn-1', 'default']]),
      diagnostics: [],
    }
    expect(context.slotAssignments.get('btn-1')).toBe('default')
  })

  it('holds diagnostics', () => {
    const context: TreeContext = {
      root: leaf('root'),
      slotAssignments: new Map(),
      diagnostics: [{ code: 'W001', message: 'missing label', severity: 'warning' }],
    }
    expect(context.diagnostics).toHaveLength(1)
  })

  it('tree nodes contain no attributes or styles', () => {
    const node: NativeTreeNode = { kind: 'native', id: 'div-1', tag: 'div', children: [] }
    expect(Object.keys(node)).toEqual(['kind', 'id', 'tag', 'children'])
    expect('props' in node).toBe(false)
    expect('style' in node).toBe(false)
    expect('className' in node).toBe(false)
    expect('attributes' in node).toBe(false)
  })
})
