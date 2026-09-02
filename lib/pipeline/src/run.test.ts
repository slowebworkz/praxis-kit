import { describe, expect, it } from 'vitest'
import type { Pass, Pipeline } from './types'
import { runPipeline } from './run'

interface Ctx {
  value: number
  trail: string[]
}

const start: Ctx = { value: 0, trail: [] }

const add = (n: number): Pass<Ctx> => ({
  name: `add-${n}`,
  execute: (ctx) => ({ context: { value: ctx.value + n } }),
})

describe('runPipeline', () => {
  it('runs passes in order, each seeing the previous merged context', () => {
    const seen: number[] = []
    const record: Pass<Ctx> = {
      name: 'record',
      execute: (ctx) => {
        seen.push(ctx.value)
        return {}
      },
    }
    const pipeline: Pipeline<Ctx> = {
      name: 'p',
      nodes: [add(1), record, add(10), record],
    }

    return runPipeline(pipeline, start).then((result) => {
      expect(seen).toEqual([1, 11])
      expect(result.context.value).toBe(11)
    })
  })

  it('awaits async passes', async () => {
    const asyncAdd: Pass<Ctx> = {
      name: 'async-add',
      execute: async (ctx) => ({ context: { value: ctx.value + 5 } }),
    }
    const result = await runPipeline({ name: 'p', nodes: [asyncAdd, add(2)] }, start)
    expect(result.context.value).toBe(7)
  })

  it('runs nested pipelines in place and folds their result', async () => {
    const inner: Pipeline<Ctx> = { name: 'inner', nodes: [add(1), add(2)] }
    const outer: Pipeline<Ctx> = { name: 'outer', nodes: [add(10), inner, add(100)] }
    const result = await runPipeline(outer, start)
    expect(result.context.value).toBe(113)
  })

  it('accumulates diagnostics across passes and nested pipelines', async () => {
    const warn = (code: string): Pass<Ctx> => ({
      name: code,
      execute: () => ({ diagnostics: [{ code, message: code, severity: 'warning' }] }),
    })
    const inner: Pipeline<Ctx> = { name: 'inner', nodes: [warn('B')] }
    const result = await runPipeline(
      { name: 'outer', nodes: [warn('A'), inner, warn('C')] },
      start,
    )
    expect(result.diagnostics.map((d) => d.code)).toEqual(['A', 'B', 'C'])
  })

  it('shallow-merges metadata in run order, last key wins', async () => {
    const meta = (patch: Record<string, unknown>): Pass<Ctx> => ({
      name: 'meta',
      execute: () => ({ metadata: patch }),
    })
    const result = await runPipeline(
      { name: 'p', nodes: [meta({ a: 1, shared: 'first' }), meta({ b: 2, shared: 'last' })] },
      start,
    )
    expect(result.metadata).toEqual({ a: 1, b: 2, shared: 'last' })
  })

  it('returns the input context unchanged for an empty pipeline', async () => {
    const result = await runPipeline({ name: 'empty', nodes: [] }, start)
    expect(result.context).toBe(start)
    expect(result.diagnostics).toEqual([])
    expect(result.metadata).toEqual({})
  })

  it('does not mutate the input context', async () => {
    await runPipeline({ name: 'p', nodes: [add(1), add(1)] }, start)
    expect(start.value).toBe(0)
  })
})
