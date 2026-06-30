import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { NodeDecoration } from '@pk2/core'
import type { NodeId } from '@pk2/pipeline'
import { extractDecoration } from './extract-decoration'
import { fromChildren, fromReactElement } from './from-react-element'

type WideEl = ReactElement<Record<string, unknown>>
const w = (el: ReactElement): WideEl => el as WideEl

// ---------------------------------------------------------------------------
// extractDecoration
// ---------------------------------------------------------------------------

describe('extractDecoration', () => {
  it('classifies string props as attributes', () => {
    const dec = extractDecoration({ 'aria-label': 'close', id: 'x' })
    expect(dec.attributes).toEqual({ 'aria-label': 'close', id: 'x' })
  })

  it('classifies number props as attributes', () => {
    const dec = extractDecoration({ maxLength: 20, tabIndex: 0 })
    expect(dec.attributes).toEqual({ maxLength: 20, tabIndex: 0 })
  })

  it('classifies boolean props as attributes when no variantKeys provided', () => {
    const dec = extractDecoration({ disabled: true, required: false })
    expect(dec.attributes).toEqual({ disabled: true, required: false })
    expect(dec.variants).toBeUndefined()
  })

  it('routes keys in variantKeys to variants regardless of type', () => {
    const variantKeys = new Set(['direction', 'flex'])
    const dec = extractDecoration({ direction: 'row', flex: true, disabled: true }, variantKeys)
    expect(dec.variants).toEqual({ direction: 'row', flex: true })
    expect(dec.attributes).toEqual({ disabled: true })
  })

  it('classifies on* functions as listeners', () => {
    const handler = () => {}
    const dec = extractDecoration({ onClick: handler })
    expect(dec.listeners).toEqual({ onClick: handler })
  })

  it('classifies style object string values as styles', () => {
    const dec = extractDecoration({ style: { color: 'red', fontSize: '14px' } })
    expect(dec.styles).toEqual({ color: 'red', fontSize: '14px' })
  })

  it('classifies style object number values as styles', () => {
    const dec = extractDecoration({ style: { opacity: 0.5, flex: 1 } })
    expect(dec.styles).toEqual({ opacity: 0.5, flex: 1 })
  })

  it('captures ref', () => {
    const ref = { current: null }
    const dec = extractDecoration({ ref })
    expect(dec.ref).toBe(ref)
  })

  it('skips children, slot, ref keys from attributes', () => {
    const dec = extractDecoration({
      children: React.createElement('span'),
      slot: 'header',
      ref: null,
    })
    expect(dec.attributes).toBeUndefined()
    expect(dec.variants).toBeUndefined()
  })

  it('omits empty record fields', () => {
    const dec = extractDecoration({ 'aria-label': 'ok' })
    expect(dec.styles).toBeUndefined()
    expect(dec.listeners).toBeUndefined()
    expect(dec.variants).toBeUndefined()
    expect(dec.ref).toBeUndefined()
  })

  it('returns empty object for props with no classifiable keys', () => {
    const dec = extractDecoration({ children: null, slot: 'body' })
    expect(Object.keys(dec)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// fromChildren
// ---------------------------------------------------------------------------

describe('fromChildren', () => {
  function makeDecoration(): Record<NodeId, NodeDecoration> {
    return {}
  }

  it('returns empty array for null children', () => {
    const nodes = fromChildren(null, 'root', makeDecoration())
    expect(nodes).toEqual([])
  })

  it('returns empty array for undefined children', () => {
    const nodes = fromChildren(undefined, 'root', makeDecoration())
    expect(nodes).toEqual([])
  })

  it('skips non-element children (strings, numbers)', () => {
    const nodes = fromChildren('hello' as ReactNode, 'root', makeDecoration())
    expect(nodes).toEqual([])
  })

  it('assigns depth-first ids to children', () => {
    const children = [
      React.createElement('span', { key: '0' }),
      React.createElement('em', { key: '1' }),
    ]
    const nodes = fromChildren(children as ReactNode, 'root', makeDecoration())
    expect(nodes[0]!.id).toBe('root-0')
    expect(nodes[1]!.id).toBe('root-1')
  })

  it('creates native NodeInput for HTML element children', () => {
    const child = React.createElement('div', { key: '0' })
    const nodes = fromChildren(child, 'root', makeDecoration())
    expect(nodes[0]).toMatchObject({ kind: 'native', tag: 'div' })
  })

  it('creates component NodeInput for non-string element type', () => {
    const Comp = (_props: { children?: ReactNode }) => null
    const child = React.createElement(Comp, { key: '0' })
    const nodes = fromChildren(child, 'root', makeDecoration())
    expect(nodes[0]).toMatchObject({ kind: 'component' })
    expect(nodes[0]).not.toHaveProperty('tag')
  })

  it('populates decoration for child props', () => {
    const decoration = makeDecoration()
    const child = React.createElement('span', { key: '0', 'aria-label': 'close' })
    fromChildren(child, 'root', decoration)
    expect(decoration['root-0']?.attributes).toEqual({ 'aria-label': 'close' })
  })

  it('recurses into nested children with depth-first ids', () => {
    const inner = React.createElement('em', { key: '0' })
    const outer = React.createElement('span', { key: '0' }, inner)
    const decoration = makeDecoration()
    const nodes = fromChildren(outer, 'root', decoration)
    expect(nodes[0]?.children?.[0]?.id).toBe('root-0-0')
  })

  it('assigns slot from slot prop', () => {
    const child = React.createElement('span', { key: '0', slot: 'icon' })
    const nodes = fromChildren(child, 'root', makeDecoration())
    expect(nodes[0]).toMatchObject({ slot: 'icon' })
  })

  it('omits slot field when slot prop is absent', () => {
    const child = React.createElement('span', { key: '0' })
    const nodes = fromChildren(child, 'root', makeDecoration())
    expect(nodes[0]).not.toHaveProperty('slot')
  })

  it('threads variantKeys into child decoration', () => {
    const decoration = makeDecoration()
    const child = React.createElement('span', { key: '0', flex: true, id: 'x' })
    fromChildren(child, 'root', decoration, new Set(['flex']))
    expect(decoration['root-0']?.variants).toEqual({ flex: true })
    expect(decoration['root-0']?.attributes).toEqual({ id: 'x' })
  })
})

// ---------------------------------------------------------------------------
// fromReactElement
// ---------------------------------------------------------------------------

describe('fromReactElement', () => {
  it('builds a native root node from an HTML element', () => {
    const el = w(React.createElement('div', { id: 'wrap' }))
    const { root, decoration } = fromReactElement(el)
    expect(root).toMatchObject({ kind: 'native', id: 'root', tag: 'div' })
    expect(decoration['root']?.attributes).toEqual({ id: 'wrap' })
  })

  it('builds a component root node for a non-string element type', () => {
    const Comp = (_props: { children?: ReactNode }) => null
    const el = w(React.createElement(Comp))
    const { root } = fromReactElement(el)
    expect(root).toMatchObject({ kind: 'component', id: 'root' })
    expect(root).not.toHaveProperty('tag')
  })

  it('collects children under root', () => {
    const el = w(
      React.createElement(
        'div',
        null,
        React.createElement('span', { key: '0' }),
        React.createElement('em', { key: '1' }),
      ),
    )
    const { root } = fromReactElement(el)
    expect(root.children).toHaveLength(2)
    expect(root.children?.[0]?.id).toBe('root-0')
    expect(root.children?.[1]?.id).toBe('root-1')
  })

  it('collects decoration for root and children', () => {
    const el = w(
      React.createElement(
        'div',
        { 'aria-label': 'outer' },
        React.createElement('span', { key: '0', 'aria-label': 'inner' }),
      ),
    )
    const { decoration } = fromReactElement(el)
    expect(decoration['root']?.attributes?.['aria-label']).toBe('outer')
    expect(decoration['root-0']?.attributes?.['aria-label']).toBe('inner')
  })

  it('puts boolean props in attributes without variantKeys', () => {
    const el = w(React.createElement('div', { disabled: true }))
    const { decoration } = fromReactElement(el)
    expect(decoration['root']?.attributes).toEqual({ disabled: true })
    expect(decoration['root']?.variants).toBeUndefined()
  })

  it('routes variantKeys to variants for root and children', () => {
    const el = w(
      React.createElement(
        'div',
        { direction: 'row', flex: true, 'aria-label': 'box' },
        React.createElement('span', { key: '0', cols: '2', disabled: true }),
      ),
    )
    const variantKeys = new Set(['direction', 'flex', 'cols'])
    const { decoration } = fromReactElement(el, variantKeys)
    expect(decoration['root']?.variants).toEqual({ direction: 'row', flex: true })
    expect(decoration['root']?.attributes).toEqual({ 'aria-label': 'box' })
    expect(decoration['root-0']?.variants).toEqual({ cols: '2' })
    expect(decoration['root-0']?.attributes).toEqual({ disabled: true })
  })

  it('assigns slot from root slot prop', () => {
    const el = w(React.createElement('div', { slot: 'header' }))
    const { root } = fromReactElement(el)
    expect(root).toMatchObject({ slot: 'header' })
  })

  it('omits decoration entry when root has no classifiable props', () => {
    const el = w(React.createElement('div', null))
    const { decoration } = fromReactElement(el)
    expect(decoration['root']).toBeUndefined()
  })

  it('assigns independent ids across sibling subtrees', () => {
    const el = w(
      React.createElement(
        'div',
        null,
        React.createElement('span', { key: '0' }, React.createElement('em')),
        React.createElement('strong', { key: '1' }, React.createElement('small')),
      ),
    )
    const { root } = fromReactElement(el)
    expect(root.children?.[0]?.children?.[0]?.id).toBe('root-0-0')
    expect(root.children?.[1]?.children?.[0]?.id).toBe('root-1-0')
  })

  it('collects styles for child nodes', () => {
    const el = w(
      React.createElement(
        'div',
        null,
        React.createElement('span', { key: '0', style: { color: 'red' } }),
      ),
    )
    const { decoration } = fromReactElement(el)
    expect(decoration['root-0']?.styles).toEqual({ color: 'red' })
  })

  it('collects listeners for child nodes', () => {
    const onClick = () => {}
    const el = w(
      React.createElement('div', null, React.createElement('button', { key: '0', onClick })),
    )
    const { decoration } = fromReactElement(el)
    expect(decoration['root-0']?.listeners?.onClick).toBe(onClick)
  })

  it('collects all decoration kinds simultaneously', () => {
    const onClick = () => {}
    const ref = { current: null }
    const el = w(
      React.createElement('button', {
        direction: 'row',
        disabled: true,
        style: { opacity: 0.5 },
        onClick,
        ref,
      }),
    )
    const { decoration } = fromReactElement(el, new Set(['direction']))
    expect(decoration['root']?.variants).toEqual({ direction: 'row' })
    expect(decoration['root']?.attributes).toEqual({ disabled: true })
    expect(decoration['root']?.styles).toEqual({ opacity: 0.5 })
    expect(decoration['root']?.listeners?.onClick).toBe(onClick)
    expect(decoration['root']?.ref).toBeDefined()
  })

  it('builds a complete tree: root → root-0 + root-1 with decoration on each node', () => {
    // <div id="wrap">
    //   <span aria-label="text" />
    //   <button disabled />
    // </div>
    const el = w(
      React.createElement(
        'div',
        { id: 'wrap' },
        React.createElement('span', { key: '0', 'aria-label': 'text' }),
        React.createElement('button', { key: '1', disabled: true }),
      ),
    )
    const { root, decoration } = fromReactElement(el)

    // tree shape
    expect(root).toMatchObject({ kind: 'native', id: 'root', tag: 'div' })
    expect(root.children).toHaveLength(2)
    expect(root.children?.[0]).toMatchObject({ kind: 'native', id: 'root-0', tag: 'span' })
    expect(root.children?.[1]).toMatchObject({ kind: 'native', id: 'root-1', tag: 'button' })

    // decoration attached to the correct ids
    expect(decoration['root']?.attributes).toEqual({ id: 'wrap' })
    expect(decoration['root-0']?.attributes).toEqual({ 'aria-label': 'text' })
    expect(decoration['root-1']?.attributes).toEqual({ disabled: true })
  })
})
