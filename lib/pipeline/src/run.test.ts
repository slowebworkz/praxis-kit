import { describe, expect, it } from 'vitest'
import type { Pass, Pipeline } from './types'
import { ParallelConflictError, runPipeline } from './run'

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

  it('defaults to sequential when strategy is omitted', async () => {
    const seen: number[] = []
    const record: Pass<Ctx> = {
      name: 'record',
      execute: (ctx) => {
        seen.push(ctx.value)
        return {}
      },
    }
    await runPipeline({ name: 'p', nodes: [add(1), record, add(1), record] }, start)
    expect(seen).toEqual([1, 2])
  })
})

describe('runPipeline — parallel', () => {
  it('runs every node against the same input and merges disjoint patches', async () => {
    const setValue: Pass<Ctx> = { name: 'v', execute: () => ({ context: { value: 42 } }) }
    const appendTrail: Pass<Ctx> = {
      name: 't',
      execute: (ctx) => ({ context: { trail: [...ctx.trail, 'x'] } }),
    }
    const result = await runPipeline(
      { name: 'p', strategy: 'parallel', nodes: [setValue, appendTrail] },
      start,
    )
    expect(result.context).toEqual({ value: 42, trail: ['x'] })
  })

  it('does not let one node see another node\'s writes', async () => {
    const seen: number[] = []
    const a: Pass<Ctx> = { name: 'a', execute: () => ({ context: { value: 100 } }) }
    const b: Pass<Ctx> = {
      name: 'b',
      execute: (ctx) => {
        seen.push(ctx.value)
        return { context: { trail: ['b'] } }
      },
    }
    await runPipeline({ name: 'p', strategy: 'parallel', nodes: [a, b] }, start)
    expect(seen).toEqual([0])
  })

  it('throws ParallelConflictError when two nodes write the same key', async () => {
    const a: Pass<Ctx> = { name: 'a', execute: () => ({ context: { value: 1 } }) }
    const b: Pass<Ctx> = { name: 'b', execute: () => ({ context: { value: 2 } }) }
    await expect(
      runPipeline({ name: 'clash', strategy: 'parallel', nodes: [a, b] }, start),
    ).rejects.toBeInstanceOf(ParallelConflictError)
    await expect(
      runPipeline({ name: 'clash', strategy: 'parallel', nodes: [a, b] }, start),
    ).rejects.toMatchObject({ pipeline: 'clash', keys: ['value'] })
  })

  it('accumulates diagnostics and metadata in node order', async () => {
    const warn = (code: string): Pass<Ctx> => ({
      name: code,
      execute: () => ({
        diagnostics: [{ code, message: code, severity: 'warning' }],
        metadata: { [code]: true },
      }),
    })
    const result = await runPipeline(
      { name: 'p', strategy: 'parallel', nodes: [warn('A'), warn('B')] },
      start,
    )
    expect(result.diagnostics.map((d) => d.code)).toEqual(['A', 'B'])
    expect(result.metadata).toEqual({ A: true, B: true })
  })

  it('folds a nested pipeline\'s patch via its diff against the shared input', async () => {
    const inner: Pipeline<Ctx> = { name: 'inner', nodes: [add(5)] }
    const sibling: Pass<Ctx> = {
      name: 's',
      execute: (ctx) => ({ context: { trail: [...ctx.trail, 's'] } }),
    }
    const result = await runPipeline(
      { name: 'outer', strategy: 'parallel', nodes: [inner, sibling] },
      start,
    )
    expect(result.context).toEqual({ value: 5, trail: ['s'] })
  })

  it('detects a conflict between a nested pipeline and a sibling on the same key', async () => {
    const inner: Pipeline<Ctx> = { name: 'inner', nodes: [add(5)] }
    const sibling: Pass<Ctx> = { name: 's', execute: () => ({ context: { value: 9 } }) }
    await expect(
      runPipeline({ name: 'outer', strategy: 'parallel', nodes: [inner, sibling] }, start),
    ).rejects.toMatchObject({ keys: ['value'] })
  })
})
