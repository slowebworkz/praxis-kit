import type { MergeStrategy } from '@pk2/merge'
import { describe, expect, it } from 'vitest'
import { createPipeline } from './create-pipeline'
import { executePipeline } from './execute-pipeline'
import type { PipelineNode } from './types'

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

  describe('nested pipelines', () => {
    it('executes a nested pipeline as a single node', async () => {
      const inner = createPipeline<Ctx>({
        name: 'inner',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map([
          ['x', { name: 'x', execute: () => ({ context: { values: [10] } }) }],
          ['y', { name: 'y', execute: () => ({ context: { values: [20] } }) }],
        ]),
      })
      const outer = createPipeline<Ctx>({
        name: 'outer',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['inner', inner],
          ['b', { name: 'b', execute: () => ({ context: { values: [2] } }) }],
        ]),
      })
      const result = await executePipeline(outer, initial)
      expect(result.values).toEqual([1, 10, 20, 2])
    })

    it('passes accumulated context into the nested pipeline', async () => {
      const seen: number[][] = []
      const inner = createPipeline<Ctx>({
        name: 'inner',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map([
          [
            'x',
            {
              name: 'x',
              execute: (ctx) => {
                seen.push([...ctx.values])
                return { context: { values: [99] } }
              },
            },
          ],
        ]),
      })
      const outer = createPipeline<Ctx>({
        name: 'outer',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['inner', inner],
        ]),
      })
      await executePipeline(outer, initial)
      expect(seen[0]).toEqual([1])
    })

    it('uses the nested pipeline own merge strategy', async () => {
      const overwriteMerge: MergeStrategy<Ctx> = {
        merge: (_prev, inc) => ({ values: inc.values ?? [] }),
      }
      const inner = createPipeline<Ctx>({
        name: 'inner',
        strategy: 'sequential',
        merge: overwriteMerge,
        nodes: new Map([
          ['x', { name: 'x', execute: () => ({ context: { values: [10] } }) }],
          ['y', { name: 'y', execute: () => ({ context: { values: [20] } }) }],
        ]),
      })
      const outer = createPipeline<Ctx>({
        name: 'outer',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['inner', inner],
        ]),
      })
      const result = await executePipeline(outer, initial)
      // inner uses overwrite: after x [10], after y [20] → inner returns [20]
      // the nested pipeline result replaces ctx directly; no outer merge wraps it
      expect(result.values).toEqual([20])
    })

    it('awaits async passes inside a nested pipeline', async () => {
      const inner = createPipeline<Ctx>({
        name: 'inner',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map([
          ['x', { name: 'x', execute: () => Promise.resolve({ context: { values: [10] } }) }],
          ['y', { name: 'y', execute: () => ({ context: { values: [20] } }) }],
        ]),
      })
      const outer = createPipeline<Ctx>({
        name: 'outer',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['inner', inner],
        ]),
      })
      const result = await executePipeline(outer, initial)
      expect(result.values).toEqual([1, 10, 20])
    })

    it('pass after nested pipeline sees context accumulated through nested passes', async () => {
      const seen: number[][] = []
      const inner = createPipeline<Ctx>({
        name: 'inner',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map([
          ['x', { name: 'x', execute: () => ({ context: { values: [10] } }) }],
          ['y', { name: 'y', execute: () => ({ context: { values: [20] } }) }],
        ]),
      })
      const outer = createPipeline<Ctx>({
        name: 'outer',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['inner', inner],
          [
            'b',
            {
              name: 'b',
              execute: (ctx) => {
                seen.push([...ctx.values])
                return {}
              },
            },
          ],
        ]),
      })
      await executePipeline(outer, initial)
      expect(seen[0]).toEqual([1, 10, 20])
    })

    it('handoff: pass after nested pipeline receives nested result as context', async () => {
      const overwriteMerge: MergeStrategy<Ctx> = {
        merge: (_prev, inc) => ({ values: inc.values ?? [] }),
      }
      const inner = createPipeline<Ctx>({
        name: 'inner',
        strategy: 'sequential',
        merge: overwriteMerge,
        nodes: new Map([
          ['x', { name: 'x', execute: () => ({ context: { values: [10] } }) }],
          ['y', { name: 'y', execute: () => ({ context: { values: [20] } }) }],
        ]),
      })
      const outer = createPipeline<Ctx>({
        name: 'outer',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['inner', inner],
          ['b', { name: 'b', execute: () => ({ context: { values: [2] } }) }],
        ]),
      })
      const result = await executePipeline(outer, initial)
      // inner overwrites: [1] → [10] → [20]; b appends to [20]: [20, 2]
      expect(result.values).toEqual([20, 2])
    })

    it('supports doubly-nested pipelines', async () => {
      const deepest = createPipeline<Ctx>({
        name: 'deepest',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map([['z', { name: 'z', execute: () => ({ context: { values: [100] } }) }]]),
      })
      const middle = createPipeline<Ctx>({
        name: 'middle',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['deepest', deepest],
          ['m', { name: 'm', execute: () => ({ context: { values: [50] } }) }],
        ]),
      })
      const outer = createPipeline<Ctx>({
        name: 'outer',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map<string, PipelineNode<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['middle', middle],
        ]),
      })
      const result = await executePipeline(outer, initial)
      expect(result.values).toEqual([1, 100, 50])
    })
  })
})
