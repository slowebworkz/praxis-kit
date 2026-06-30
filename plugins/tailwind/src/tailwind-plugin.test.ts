import type { MergeStrategy, Pipeline  } from '@pk2/pipeline'
import { createPipeline, isPass } from '@pk2/pipeline'
import type { StyleContext } from '@pk2/style'
import { basePass, focusPass, hoverPass, styleMergeStrategy } from '@pk2/style'
import { describe, expect, it } from 'vitest'
import { tailwindPlugin } from './tailwind-plugin'

async function runPipeline(pipeline: Pipeline<StyleContext>): Promise<StyleContext> {
  let ctx: StyleContext = { classes: [] }
  for (const [, node] of pipeline.nodes) {
    if (!isPass(node)) continue
    const result = await node.execute(ctx)
    ctx = pipeline.merge.merge(ctx, result.context ?? {})
  }
  return ctx
}

describe('tailwind plugin', () => {
  it('injects tailwindPass into the pipeline', () => {
    const pipeline = createPipeline<StyleContext>({
      name: 'style',
      strategy: 'sequential',
      merge: styleMergeStrategy,
      nodes: new Map([['base', basePass]]),
      plugins: [tailwindPlugin],
    })
    expect(pipeline.nodes.has('tailwind')).toBe(true)
    expect(pipeline.nodes.has('base')).toBe(true)
  })

  it('core nodes and plugin nodes coexist in the pipeline', () => {
    const pipeline = createPipeline<StyleContext>({
      name: 'style',
      strategy: 'sequential',
      merge: styleMergeStrategy,
      nodes: new Map([
        ['base', basePass],
        ['hover', hoverPass],
        ['focus', focusPass],
      ]),
      plugins: [tailwindPlugin],
    })
    expect([...pipeline.nodes.keys()]).toEqual(['base', 'hover', 'focus', 'tailwind'])
  })

  it('accumulates classes from core and plugin passes', async () => {
    const pipeline = createPipeline<StyleContext>({
      name: 'style',
      strategy: 'sequential',
      merge: styleMergeStrategy,
      nodes: new Map([
        ['base', basePass],
        ['hover', hoverPass],
        ['focus', focusPass],
      ]),
      plugins: [tailwindPlugin],
    })
    const result = await runPipeline(pipeline)
    expect(result.classes).toEqual([
      'inline-flex',
      'hover:bg-blue-500',
      'focus:ring',
      'bg-blue-500',
      'text-white',
    ])
  })

  it('plugin nodes are ordered after core nodes', async () => {
    const pipeline = createPipeline<StyleContext>({
      name: 'style',
      strategy: 'sequential',
      merge: styleMergeStrategy,
      nodes: new Map([['base', basePass]]),
      plugins: [tailwindPlugin],
    })
    const result = await runPipeline(pipeline)
    expect(result.classes).toEqual(['inline-flex', 'bg-blue-500', 'text-white'])
  })

  it('collision with a core node key throws', () => {
    expect(() =>
      createPipeline<StyleContext>({
        name: 'style',
        strategy: 'sequential',
        merge: styleMergeStrategy,
        nodes: new Map([['tailwind', basePass]]),
        plugins: [tailwindPlugin],
      }),
    ).toThrow(/"tailwind"/)
  })

  it('the pipeline carries its own merge strategy', () => {
    const pipeline = createPipeline<StyleContext>({
      name: 'style',
      strategy: 'sequential',
      merge: styleMergeStrategy,
      nodes: new Map([['base', basePass]]),
      plugins: [tailwindPlugin],
    })
    expect(pipeline.merge).toBe(styleMergeStrategy)
  })

  it('plugin passes remain independent of merge semantics', async () => {
    const overwriteStrategy: MergeStrategy<StyleContext> = {
      merge: (_, incoming) => ({ classes: incoming.classes ?? [] }),
    }
    const pipeline = createPipeline<StyleContext>({
      name: 'style',
      strategy: 'sequential',
      merge: overwriteStrategy,
      nodes: new Map([
        ['base', basePass],
        ['hover', hoverPass],
        ['focus', focusPass],
      ]),
      plugins: [tailwindPlugin],
    })
    const result = await runPipeline(pipeline)
    expect(result.classes).toEqual(['bg-blue-500', 'text-white'])
  })
})
