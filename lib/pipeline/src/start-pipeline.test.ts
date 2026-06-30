import type { MergeStrategy } from '@pk2/pipeline'
import { describe, expect, it } from 'vitest'
import { executePipeline } from './execute-pipeline'
import { startPipeline } from './start-pipeline'
import type { Pass } from './types'

interface Ctx {
  values: number[]
}

const appendMerge: MergeStrategy<Ctx> = {
  merge: (prev, inc) => ({ values: [...prev.values, ...(inc.values ?? [])] }),
}

const overwriteMerge: MergeStrategy<Ctx> = {
  merge: (_prev, inc) => ({ values: inc.values ?? [] }),
}

const buildOptions = { name: 'test', strategy: 'sequential' as const, merge: appendMerge }

const initial: Ctx = { values: [] }

const pass = (name: string, value: number): Pass<Ctx> => ({
  name,
  execute: () => ({ context: { values: [value] } }),
})

describe('startPipeline', () => {
  it('builds an empty pipeline when no processors are added', async () => {
    const pipeline = startPipeline(buildOptions).build()
    expect(await executePipeline(pipeline, initial)).toEqual({ values: [] })
  })

  it('.then adds processors in order', async () => {
    const pipeline = startPipeline(buildOptions)
      .then(pass('a', 1))
      .then(pass('b', 2))
      .then(pass('c', 3))
      .build()
    expect(await executePipeline(pipeline, initial)).toEqual({ values: [1, 2, 3] })
  })

  it('.then(undefined) is a no-op', async () => {
    const pipeline = startPipeline(buildOptions)
      .then(pass('a', 1))
      .then(undefined)
      .then(pass('c', 3))
      .build()
    expect(await executePipeline(pipeline, initial)).toEqual({ values: [1, 3] })
  })

  it('accepts Processor | undefined — undefined from a factory composes directly', async () => {
    const maybePass = (include: boolean): Pass<Ctx> | undefined =>
      include ? pass('b', 2) : undefined

    const withB = startPipeline(buildOptions).then(pass('a', 1)).then(maybePass(true)).build()
    const withoutB = startPipeline(buildOptions).then(pass('a', 1)).then(maybePass(false)).build()

    expect(await executePipeline(withB, initial)).toEqual({ values: [1, 2] })
    expect(await executePipeline(withoutB, initial)).toEqual({ values: [1] })
  })

  it('is immutable — branching produces independent pipelines', async () => {
    const base = startPipeline(buildOptions).then(pass('a', 1))
    const left = base.then(pass('b', 2)).build()
    const right = base.then(pass('c', 3)).build()
    expect(await executePipeline(left, initial)).toEqual({ values: [1, 2] })
    expect(await executePipeline(right, initial)).toEqual({ values: [1, 3] })
  })

  it('accepts nested pipelines via .then', async () => {
    const inner = startPipeline({ name: 'inner', strategy: 'sequential', merge: appendMerge })
      .then(pass('x', 10))
      .then(pass('y', 20))
      .build()
    const outer = startPipeline(buildOptions)
      .then(pass('a', 1))
      .then(inner)
      .then(pass('b', 2))
      .build()
    expect(await executePipeline(outer, initial)).toEqual({ values: [1, 10, 20, 2] })
  })

  it('nested pipeline with own merge strategy — handoff to outer', async () => {
    const inner = startPipeline({ name: 'inner', strategy: 'sequential', merge: overwriteMerge })
      .then(pass('x', 10))
      .then(pass('y', 20))
      .build()
    const outer = startPipeline(buildOptions)
      .then(pass('a', 1))
      .then(inner)
      .then(pass('b', 2))
      .build()
    // inner overwrites: [1] → [10] → [20]; b appends to [20]: [20, 2]
    expect(await executePipeline(outer, initial)).toEqual({ values: [20, 2] })
  })

  it('pass after nested pipeline sees nested pipeline final context', async () => {
    const seen: number[][] = []
    const inner = startPipeline({ name: 'inner', strategy: 'sequential', merge: appendMerge })
      .then(pass('x', 10))
      .then(pass('y', 20))
      .build()
    const observer: Pass<Ctx> = {
      name: 'observer',
      execute(ctx) {
        seen.push([...ctx.values])
        return {}
      },
    }
    const outer = startPipeline(buildOptions).then(pass('a', 1)).then(inner).then(observer).build()
    await executePipeline(outer, initial)
    expect(seen[0]).toEqual([1, 10, 20])
  })

  it('duplicate names — build() throws', () => {
    expect(() => startPipeline(buildOptions).then(pass('a', 1)).then(pass('a', 2)).build()).toThrow(
      'Pipeline "test" contains duplicate processor "a".',
    )
  })

  it('build() sets name and strategy on the pipeline', () => {
    const pipeline = startPipeline({
      name: 'my-pipeline',
      strategy: 'sequential',
      merge: appendMerge,
    }).build()
    expect(pipeline.name).toBe('my-pipeline')
    expect(pipeline.strategy).toBe('sequential')
  })

  it('node names become Map keys', () => {
    const pipeline = startPipeline(buildOptions)
      .then(pass('alpha', 1))
      .then(pass('beta', 2))
      .build()
    expect([...pipeline.nodes.keys()]).toEqual(['alpha', 'beta'])
  })
})
