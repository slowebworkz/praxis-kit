import type { MergeStrategy } from './types/merge-strategy'
import { describe, expect, it } from 'vitest'
import { createPipeline } from './create-pipeline'
import { executeProcessor } from './execute-processor'
import type { Processor } from './types'

interface Ctx {
  values: number[]
}

const appendMerge: MergeStrategy<Ctx> = {
  merge: (prev, inc) => ({ values: [...prev.values, ...(inc.values ?? [])] }),
}

const overwriteMerge: MergeStrategy<Ctx> = {
  merge: (_prev, inc) => ({ values: inc.values ?? [] }),
}

const initial: Ctx = { values: [] }

describe('executeProcessor', () => {
  describe('Pass', () => {
    it('executes a pass and merges the result', async () => {
      const pass: Processor<Ctx> = { name: 'a', execute: () => ({ context: { values: [1] } }) }
      const result = await executeProcessor(pass, initial, appendMerge)
      expect(result.values).toEqual([1])
    })

    it('returns ctx unchanged when pass returns no context', async () => {
      const pass: Processor<Ctx> = { name: 'a', execute: () => ({}) }
      const result = await executeProcessor(pass, initial, appendMerge)
      expect(result.values).toEqual([])
    })

    it('awaits async passes', async () => {
      const pass: Processor<Ctx> = {
        name: 'a',
        execute: () => Promise.resolve({ context: { values: [42] } }),
      }
      const result = await executeProcessor(pass, initial, appendMerge)
      expect(result.values).toEqual([42])
    })

    it('uses the provided merge strategy', async () => {
      const ctx: Ctx = { values: [1, 2] }
      const pass: Processor<Ctx> = { name: 'a', execute: () => ({ context: { values: [3] } }) }
      const result = await executeProcessor(pass, ctx, overwriteMerge)
      expect(result.values).toEqual([3])
    })
  })

  describe('Pipeline', () => {
    it('executes all nodes in the pipeline', async () => {
      const pipeline = createPipeline<Ctx>({
        name: 'p',
        strategy: 'sequential',
        merge: appendMerge,
        nodes: new Map([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['b', { name: 'b', execute: () => ({ context: { values: [2] } }) }],
        ]),
      })
      const result = await executeProcessor(pipeline, initial, appendMerge)
      expect(result.values).toEqual([1, 2])
    })

    it('uses the pipeline own merge strategy, not the outer merge', async () => {
      const pipeline = createPipeline<Ctx>({
        name: 'p',
        strategy: 'sequential',
        merge: overwriteMerge,
        nodes: new Map([
          ['a', { name: 'a', execute: () => ({ context: { values: [10] } }) }],
          ['b', { name: 'b', execute: () => ({ context: { values: [20] } }) }],
        ]),
      })
      const result = await executeProcessor(pipeline, initial, appendMerge)
      expect(result.values).toEqual([20])
    })

    it('recurses into nested pipelines', async () => {
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
        nodes: new Map<string, Processor<Ctx>>([
          ['a', { name: 'a', execute: () => ({ context: { values: [1] } }) }],
          ['inner', inner],
        ]),
      })
      const result = await executeProcessor(outer, initial, appendMerge)
      expect(result.values).toEqual([1, 10, 20])
    })
  })
})
