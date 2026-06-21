import { describe, expect, it } from 'vitest'
import type { Pass } from './Pass'
import type { Pipeline } from './Pipeline'
import type { PipelineNode } from './PipelineNode'

interface TestContext {
  value: number
}

const makePass = (name: string): Pass<TestContext> => ({
  name,
  execute: (ctx) => ({ context: { value: ctx.value + 1 } }),
})

describe('Pipeline', () => {
  it('represents a sequential pipeline', () => {
    const pipeline: Pipeline<TestContext> = {
      name: 'test',
      strategy: 'sequential',
      nodes: new Map([
        ['a', makePass('a')],
        ['b', makePass('b')],
      ]),
    }
    expect(pipeline.strategy).toBe('sequential')
    expect(pipeline.nodes.size).toBe(2)
  })

  it('represents a parallel pipeline', () => {
    const pipeline: Pipeline<TestContext> = {
      name: 'test',
      strategy: 'parallel',
      nodes: new Map([
        ['a', makePass('a')],
        ['b', makePass('b')],
        ['c', makePass('c')],
      ]),
    }
    expect(pipeline.strategy).toBe('parallel')
    expect(pipeline.nodes.size).toBe(3)
  })

  it('represents a recursive pipeline', () => {
    const inner: Pipeline<TestContext> = {
      name: 'inner',
      strategy: 'sequential',
      nodes: new Map([
        ['b', makePass('b')],
        ['c', makePass('c')],
      ]),
    }
    const outer: Pipeline<TestContext> = {
      name: 'outer',
      strategy: 'sequential',
      nodes: new Map<string, PipelineNode<TestContext>>([
        ['a', makePass('a')],
        ['inner', inner],
        ['d', makePass('d')],
      ]),
    }
    expect(outer.nodes.get('inner')).toBe(inner)
    expect((outer.nodes.get('inner') as Pipeline<TestContext>).nodes.size).toBe(2)
  })

  it('accepts an empty pipeline', () => {
    const pipeline: Pipeline<TestContext> = {
      name: 'empty',
      strategy: 'sequential',
      nodes: new Map(),
    }
    expect(pipeline.nodes.size).toBe(0)
  })
})
