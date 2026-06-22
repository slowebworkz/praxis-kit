import { createElement } from 'react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { compileComponent } from '@pk2/compiler'
import {
  applyAttributes,
  buildRenderContext,
  buildTreeContext,
  getActiveProps,
  renderComponent,
} from '@pk2/core'
import type { ComponentContext } from '@pk2/core'
import type { Pass } from '@pk2/pipeline'
import { createPipeline, executePipeline } from '@pk2/pipeline'
import { reactBackend } from '@pk2/react'
import { createVariantPass, styleMergeStrategy } from '@pk2/style'
import type { StyleContext, VariantConfig } from '@pk2/style'
import { fromReactElement } from './from-react'

type WideElement = ReactElement<Record<string, unknown>>

const identityPass: Pass<ComponentContext> = {
  name: 'identity',
  execute: () => ({
    context: {
      identity: { id: 'box-1', name: 'Box', tag: 'div' },
      capabilities: {},
      metadata: {},
      diagnostics: [],
    },
  }),
}

const boxVariants = {
  direction: { row: 'flex-row', col: 'flex-col' },
  align: {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  },
  gap: { none: 'gap-0', sm: 'gap-2', md: 'gap-4', lg: 'gap-8' },
  cols: { '2': 'grid-cols-2', '3': 'grid-cols-3', '4': 'grid-cols-4' },
} as const satisfies VariantConfig['variants']

const boxPresets = {
  row: { direction: 'row', align: 'center', gap: 'md' },
  stack: { direction: 'col', gap: 'sm' },
} satisfies VariantConfig['presets']

const boxConfig: VariantConfig = { variants: boxVariants, presets: boxPresets }

const boxVariantKeys = new Set(Object.keys(boxVariants))

async function resolveStyleContext(activeProps: Record<string, unknown>): Promise<StyleContext> {
  const pipeline = createPipeline<StyleContext>({
    name: 'box-style',
    strategy: 'sequential',
    merge: styleMergeStrategy,
    nodes: new Map([['variant', createVariantPass(activeProps, boxConfig)]]),
  })
  return executePipeline(pipeline, { classes: [] })
}

async function renderBoxElement(el: ReactElement): Promise<WideElement> {
  const { root, decoration } = fromReactElement(el)
  const activeProps = getActiveProps('root', decoration)
  const styleContext = await resolveStyleContext(activeProps)
  const className = styleContext.classes.join(' ')
  const classAttr = className.length > 0 ? { className } : {}
  const styledDecoration = applyAttributes('root', classAttr, decoration, boxVariantKeys)
  const tree = buildTreeContext(root)
  const render = buildRenderContext(styledDecoration)
  const definition = await compileComponent(new Map([['identity', identityPass]]))
  return renderComponent(definition!, tree, render, reactBackend) as WideElement
}

describe('style bridge — variant props → className', () => {
  it('resolves direction and gap to className', async () => {
    const output = await renderBoxElement(createElement('div', { direction: 'row', gap: 'md' }))
    expect(output.props.className).toBe('flex-row gap-4')
  })

  it('resolves align independently', async () => {
    const output = await renderBoxElement(createElement('div', { align: 'center' }))
    expect(output.props.className).toBe('items-center')
  })

  it('strips variant keys from rendered props', async () => {
    const output = await renderBoxElement(createElement('div', { direction: 'col', gap: 'sm' }))
    expect(output.props.direction).toBeUndefined()
    expect(output.props.gap).toBeUndefined()
  })

  it('preserves non-variant attributes alongside className', async () => {
    const output = await renderBoxElement(
      createElement('div', { 'aria-label': 'layout', direction: 'row', gap: 'lg' }),
    )
    expect(output.props['aria-label']).toBe('layout')
    expect(output.props.className).toBe('flex-row gap-8')
  })

  it('applies preset defaults when preset prop is active', async () => {
    const output = await renderBoxElement(createElement('div', { preset: 'row' }))
    expect(output.props.className).toBe('flex-row items-center gap-4')
  })

  it('explicit prop overrides preset default', async () => {
    const output = await renderBoxElement(createElement('div', { preset: 'row', align: 'start' }))
    expect(output.props.className).toBe('flex-row items-start gap-4')
  })

  it('produces empty className when no matching variants', async () => {
    const output = await renderBoxElement(createElement('div', { 'aria-label': 'bare' }))
    expect(output.props).not.toHaveProperty('direction')
    expect(output.props).not.toHaveProperty('gap')
    expect(output.props['aria-label']).toBe('bare')
    expect(output.props.className).toBeUndefined()
  })
})

describe('style bridge — boolean variant capture', () => {
  it('captures boolean flex prop into variants', () => {
    const el = createElement('div', { flex: true, direction: 'row' })
    const { decoration } = fromReactElement(el)
    expect(decoration['root']?.variants?.['flex']).toBe(true)
    expect(decoration['root']?.attributes?.['direction']).toBe('row')
  })

  it('captures boolean grid prop into variants', () => {
    const el = createElement('div', { grid: true, cols: '3' })
    const { decoration } = fromReactElement(el)
    expect(decoration['root']?.variants?.['grid']).toBe(true)
    expect(decoration['root']?.attributes?.['cols']).toBe('3')
  })

  it('does not put booleans into attributes', () => {
    const el = createElement('div', { flex: true })
    const { decoration } = fromReactElement(el)
    expect(decoration['root']?.attributes?.['flex']).toBeUndefined()
  })
})
