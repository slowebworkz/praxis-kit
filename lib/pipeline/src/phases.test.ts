import { describe, expect, it } from 'vitest'
import type { Pass } from './types'
import { PIPELINE_PHASES, phasedPipeline } from './phases'
import { runPipeline } from './run'

interface Ctx {
  trail: string[]
}

const mark = (label: string): Pass<Ctx> => ({
  name: label,
  execute: (ctx) => ({ context: { trail: [...ctx.trail, label] } }),
})

describe('phasedPipeline', () => {
  it('orders phases by PIPELINE_PHASES regardless of key order', () => {
    const pipeline = phasedPipeline<Ctx>('build', {
      emit: [mark('e')],
      normalize: [mark('n')],
      validate: [mark('v')],
      enrich: [mark('r')],
    })
    expect(pipeline.nodes.map((node) => node.name)).toEqual([
      'normalize',
      'enrich',
      'validate',
      'emit',
    ])
  })

  it('omits phases with no nodes', () => {
    const pipeline = phasedPipeline<Ctx>('build', {
      normalize: [mark('n')],
      enrich: [],
      emit: [mark('e')],
    })
    expect(pipeline.nodes.map((node) => node.name)).toEqual(['normalize', 'emit'])
  })

  it('nests each phase as a sub-pipeline named after the phase', () => {
    const pipeline = phasedPipeline<Ctx>('build', { normalize: [mark('a'), mark('b')] })
    expect(pipeline.nodes[0]).toMatchObject({
      name: 'normalize',
      nodes: [{ name: 'a' }, { name: 'b' }],
    })
  })

  it('runs end to end through runPipeline in phase order', async () => {
    const pipeline = phasedPipeline<Ctx>('build', {
      validate: [mark('v')],
      normalize: [mark('n1'), mark('n2')],
      emit: [mark('e')],
    })
    const result = await runPipeline(pipeline, { trail: [] })
    expect(result.context.trail).toEqual(['n1', 'n2', 'v', 'e'])
  })

  it('produces an empty pipeline when no phase has nodes', () => {
    const pipeline = phasedPipeline<Ctx>('noop', {})
    expect(pipeline.nodes).toEqual([])
  })

  it('exposes the canonical phase order as a readonly tuple', () => {
    expect(PIPELINE_PHASES).toEqual(['normalize', 'enrich', 'validate', 'emit'])
  })
})
