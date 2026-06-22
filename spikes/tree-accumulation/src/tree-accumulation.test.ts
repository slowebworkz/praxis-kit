import { Children, createElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { compileComponent } from '@pk2/compiler'
import { buildRenderContext, buildTreeContext, renderComponent } from '@pk2/core'
import type { ComponentContext } from '@pk2/core'
import type { Pass } from '@pk2/pipeline'
import { reactBackend } from '@pk2/react'
import { fromReactElement } from './from-react'

// Minimal pass that fills in a complete ComponentIdentity so compileComponent
// returns a non-null ComponentDefinition.
const identityPass: Pass<ComponentContext> = {
  name: 'identity',
  execute: () => ({
    context: {
      identity: { id: 'btn-1', name: 'Button', tag: 'button' },
      capabilities: {},
      metadata: {},
      diagnostics: [],
    },
  }),
}

type WideElement = ReactElement<Record<string, unknown>>
const w = (el: ReactElement): WideElement => el as WideElement

async function renderThroughPipeline(el: WideElement): Promise<WideElement> {
  const { root, decoration } = fromReactElement(el)
  const tree = buildTreeContext(root)
  const render = buildRenderContext(decoration)
  const definition = await compileComponent(new Map([['identity', identityPass]]))
  return renderComponent(definition!, tree, render, reactBackend) as WideElement
}

describe('tree accumulation — fromReactElement', () => {
  it('produces a native root node from a plain element', () => {
    const { root } = fromReactElement(w(createElement('button', { type: 'button' })))
    expect(root).toMatchObject({ kind: 'native', id: 'root', tag: 'button' })
  })

  it('extracts attributes into decoration', () => {
    const { decoration } = fromReactElement(
      w(createElement('button', { type: 'button', 'aria-label': 'close' })),
    )
    expect(decoration['root']?.attributes).toEqual({ type: 'button', 'aria-label': 'close' })
  })

  it('extracts listeners into decoration', () => {
    const onClick = () => {}
    const { decoration } = fromReactElement(w(createElement('button', { onClick })))
    expect(decoration['root']?.listeners?.onClick).toBe(onClick)
  })

  it('extracts style into decoration', () => {
    const { decoration } = fromReactElement(w(createElement('button', { style: { color: 'red' } })))
    expect(decoration['root']?.styles).toEqual({ color: 'red' })
  })

  it('walks children recursively and assigns ids', () => {
    const el = w(
      createElement(
        'div',
        null,
        createElement('span', { 'aria-hidden': 'true' }),
        createElement('button', { type: 'button' }),
      ),
    )
    const { root, decoration } = fromReactElement(el)
    const children = root.children ?? []
    expect(children).toHaveLength(2)
    expect(children[0]).toMatchObject({ kind: 'native', id: 'root-0', tag: 'span' })
    expect(children[1]).toMatchObject({ kind: 'native', id: 'root-1', tag: 'button' })
    expect(decoration['root-0']?.attributes?.['aria-hidden']).toBe('true')
  })

  it('produces a component node for non-string element types', () => {
    const MyComponent = () => null
    const { root } = fromReactElement(w(createElement(MyComponent, null)))
    expect(root.kind).toBe('component')
  })

  it('collects slot from child props', () => {
    const el = w(createElement('div', null, createElement('button', { slot: 'trigger' })))
    const { root } = fromReactElement(el)
    expect((root.children ?? [])[0]).toMatchObject({ slot: 'trigger' })
  })

  it('omits decoration entry when node has no decoratable props', () => {
    const { decoration } = fromReactElement(w(createElement('div', null)))
    expect(decoration['root']).toBeUndefined()
  })
})

describe('tree accumulation — end-to-end pipeline', () => {
  it('round-trips a React element through PK2', async () => {
    const input = w(createElement('button', { type: 'button', 'aria-label': 'Save' }))
    const output = await renderThroughPipeline(input)

    expect(output.type).toBe('button')
    expect(output.props.type).toBe('button')
    expect(output.props['aria-label']).toBe('Save')
  })

  it('preserves attributes on the output element', async () => {
    const el = w(createElement('button', { type: 'button', 'aria-label': 'Save' }))
    const output = await renderThroughPipeline(el)
    expect(output.props['aria-label']).toBe('Save')
  })

  it('preserves topology through nested children', async () => {
    const el = w(
      createElement(
        'div',
        { 'aria-label': 'wrapper' },
        createElement('span', null),
        createElement('button', { type: 'submit' }),
      ),
    )
    const output = await renderThroughPipeline(el)
    const children = Children.toArray(output.props.children as ReactNode) as WideElement[]

    expect(children).toHaveLength(2)
    expect(children[0]!.type).toBe('span')
    expect(children[1]!.props.type).toBe('submit')
  })

  it('passes slot assignments through buildTreeContext', async () => {
    const el = w(createElement('div', null, createElement('button', { slot: 'trigger' })))
    const { root } = fromReactElement(el)
    const tree = buildTreeContext(root)

    expect(tree.slotAssignments.get('root-0')).toBe('trigger')
  })
})
