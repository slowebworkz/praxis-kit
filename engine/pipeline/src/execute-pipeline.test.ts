import type { MergeStrategy } from '@pk2/merge'
import { describe, expect, it } from 'vitest'
import { createPipeline } from './create-pipeline'
import { executePipeline } from './execute-pipeline'

interface Ctx {
  values: number[]
}

const appendMerge: MergeStrategy<Ctx> = {
  merge: (prev, inc) => ({ values: [...prev.values, ...(inc.values ?? [])] }),
}

const initial: Ctx = { values: [] }

describe('executePipeline', () => {
  it('returns the initial context when there are no passes', async () => {
    const pipeline = createPipeline<Ctx>({
      name: 'empty',
      strategy: 'sequential',
      merge: appendMerge,
      nodes: new Map(),
    })
    const result = await executePipeline(pipeline, initial)
    expect(result).toEqual({ values: [] })
  })

  it('applies a single pass and merges the result', async () => {
    const pipeline = createPipeline<Ctx>({
      name: 'single',
      strategy: 'sequential',
      merge: appendMerge,
      nodes: new Map([['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }]]),
    })
    const result = await executePipeline(pipeline, initial)
    expect(result.values).toEqual([1])
  })

  it('applies multiple passes in insertion order', async () => {
    const pipeline = createPipeline<Ctx>({
      name: 'multi',
      strategy: 'sequential',
      merge: appendMerge,
      nodes: new Map([
        ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
        ['b', { name: 'b', execute: () => ({ context: { values: [2] } }) }],
        ['c', { name: 'c', execute: () => ({ context: { values: [3] } }) }],
      ]),
    })
    const result = await executePipeline(pipeline, initial)
    expect(result.values).toEqual([1, 2, 3])
  })

  it('skips passes that return no context', async () => {
    const pipeline = createPipeline<Ctx>({
      name: 'skip',
      strategy: 'sequential',
      merge: appendMerge,
      nodes: new Map([
        ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
        ['b', { name: 'b', execute: () => ({}) }],
        ['c', { name: 'c', execute: () => ({ context: { values: [3] } }) }],
      ]),
    })
    const result = await executePipeline(pipeline, initial)
    expect(result.values).toEqual([1, 3])
  })

  it('awaits async passes', async () => {
    const pipeline = createPipeline<Ctx>({
      name: 'async',
      strategy: 'sequential',
      merge: appendMerge,
      nodes: new Map([
        [
          'a',
          {
            name: 'a',
            execute: () => Promise.resolve({ context: { values: [42] } }),
          },
        ],
      ]),
    })
    const result = await executePipeline(pipeline, initial)
    expect(result.values).toEqual([42])
  })

  it('passes the accumulated context into each subsequent pass', async () => {
    const seen: number[][] = []
    const pipeline = createPipeline<Ctx>({
      name: 'accumulation',
      strategy: 'sequential',
      merge: appendMerge,
      nodes: new Map([
        [
          'a',
          {
            name: 'a',
            execute: (ctx) => {
              seen.push([...ctx.values])
              return { context: { values: [1] } }
            },
          },
        ],
        [
          'b',
          {
            name: 'b',
            execute: (ctx) => {
              seen.push([...ctx.values])
              return { context: { values: [2] } }
            },
          },
        ],
      ]),
    })
    await executePipeline(pipeline, initial)
    expect(seen[0]).toEqual([])
    expect(seen[1]).toEqual([1])
  })

  it('uses the pipeline merge strategy, not a hardcoded one', async () => {
    const overwriteMerge: MergeStrategy<Ctx> = {
      merge: (_prev, inc) => ({ values: inc.values ?? [] }),
    }
    const pipeline = createPipeline<Ctx>({
      name: 'overwrite',
      strategy: 'sequential',
      merge: overwriteMerge,
      nodes: new Map([
        ['a', { name: 'a', execute: () => ({ context: { values: [1, 2] } }) }],
        ['b', { name: 'b', execute: () => ({ context: { values: [3] } }) }],
      ]),
    })
    const result = await executePipeline(pipeline, initial)
    expect(result.values).toEqual([3])
  })
})
