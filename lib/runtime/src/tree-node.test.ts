import { describe, expect, it } from 'vitest'
import type { ComponentTreeNode, NativeTreeNode, TreeNode } from './types'

describe('TreeNode', () => {
  it('represents a component leaf node', () => {
    const node: ComponentTreeNode = {
      kind: 'component',
      id: 'btn-1',
      children: [],
    }
    expect(node.kind).toBe('component')
    expect(node.id).toBe('btn-1')
    expect(node.children).toHaveLength(0)
  })

  it('component nodes reference component ids', () => {
    const node: ComponentTreeNode = {
      kind: 'component',
      id: 'Button',
      children: [],
    }
    expect(node.id).toBe('Button')
  })

  it('represents a native leaf node', () => {
    const node: NativeTreeNode = {
      kind: 'native',
      id: 'div-1',
      tag: 'div',
      children: [],
    }
    expect(node.kind).toBe('native')
    expect(node.tag).toBe('div')
  })

  it('discriminates by kind', () => {
    const node: TreeNode = { kind: 'native', id: 'span-1', tag: 'span', children: [] }
    if (node.kind === 'native') {
      expect(node.tag).toBe('span')
    } else {
      throw new Error('expected native node')
    }
  })

  it('represents a nested tree', () => {
    const inner: NativeTreeNode = { kind: 'native', id: 'span-1', tag: 'span', children: [] }
    const outer: ComponentTreeNode = { kind: 'component', id: 'btn-1', children: [inner] }
    expect(outer.children).toHaveLength(1)
    const child = outer.children[0]!
    if (child.kind !== 'native') {
      throw new Error('expected native node')
    }
    expect(child.tag).toBe('span')
  })

  it('component nodes contain only topology', () => {
    const node: ComponentTreeNode = { kind: 'component', id: 'btn-1', children: [] }
    expect(Object.keys(node)).toEqual(['kind', 'id', 'children'])
    expect('props' in node).toBe(false)
    expect('style' in node).toBe(false)
    expect('className' in node).toBe(false)
    expect('attributes' in node).toBe(false)
  })

  it('represents a mixed component/native tree', () => {
    const root: NativeTreeNode = {
      kind: 'native',
      id: 'div-1',
      tag: 'div',
      children: [
        { kind: 'component', id: 'btn-1', children: [] },
        { kind: 'native', id: 'span-1', tag: 'span', children: [] },
      ],
    }
    expect(root.children).toHaveLength(2)
    expect(root.children[0]!.kind).toBe('component')
    expect(root.children[1]!.kind).toBe('native')
  })
})
