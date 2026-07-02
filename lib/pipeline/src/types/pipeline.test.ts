import { describe, expect, it } from 'vitest'
import type { MergeStrategy } from '@praxis-kit/pipeline'
import type { Pass } from './pass'
import type { Pipeline } from './pipeline'
import type { PipelineNode } from './pipeline-node'

interface TestContext {
  value: number
}

const makePass = (name: string): Pass<TestContext> => ({
  name,
  execute: (ctx) => ({ context: { value: ctx.value + 1 } }),
})

const identityMerge: MergeStrategy<TestContext> = {
  merge: (previous, incoming) => ({ ...previous, ...incoming }),
}

describe('Pipeline', () => {
  it('represents a sequential pipeline', () => {
    const pipeline: Pipeline<TestContext> = {
      name: 'test',
      strategy: 'sequential',
      merge: identityMerge,
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
      merge: identityMerge,
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
      merge: identityMerge,
      nodes: new Map([
        ['b', makePass('b')],
        ['c', makePass('c')],
      ]),
    }
    const outer: Pipeline<TestContext> = {
      name: 'outer',
      strategy: 'sequential',
      merge: identityMerge,
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
      merge: identityMerge,
      nodes: new Map(),
    }
    expect(pipeline.nodes.size).toBe(0)
  })
})
