import { describe, expect, it } from 'vitest'
import type { Pass, PipelineOptions } from './types'
import { createPipeline } from './create-pipeline'

interface TestContext {
  value: number
}

const makePass = (name: string): Pass<TestContext> => ({
  name,
  execute: (ctx) => ({ context: { value: ctx.value + 1 } }),
})

function makePipeline(overrides: Partial<PipelineOptions<TestContext>> = {}) {
  return createPipeline<TestContext>({
    name: 'test',
    strategy: 'sequential',
    nodes: new Map(),
    ...overrides,
  })
}

describe('createPipeline()', () => {
  it('constructs pipeline with the given name and strategy', () => {
    const pipeline = makePipeline({
      name: 'my-pipeline',
      strategy: 'parallel',
      nodes: new Map([['a', makePass('a')]]),
    })
    expect(pipeline.name).toBe('my-pipeline')
    expect(pipeline.strategy).toBe('parallel')
  })

  it('copies core nodes into the pipeline', () => {
    const pipeline = makePipeline({
      nodes: new Map([
        ['a', makePass('a')],
        ['b', makePass('b')],
      ]),
    })
    expect(pipeline.nodes.has('a')).toBe(true)
    expect(pipeline.nodes.has('b')).toBe(true)
    expect(pipeline.nodes.size).toBe(2)
  })

  it('injects plugin nodes', () => {
    const pipeline = makePipeline({
      nodes: new Map([['core', makePass('core')]]),
      plugins: [{ name: 'plugin', nodes: new Map([['extra', makePass('extra')]]) }],
    })
    expect(pipeline.nodes.size).toBe(2)
    expect(pipeline.nodes.has('core')).toBe(true)
    expect(pipeline.nodes.has('extra')).toBe(true)
  })

  it('does not mutate the original nodes map', () => {
    const original = new Map([['a', makePass('a')]])
    makePipeline({
      nodes: original,
      plugins: [{ name: 'p', nodes: new Map([['b', makePass('b')]]) }],
    })
    expect(original.size).toBe(1)
  })

  it('returns a frozen pipeline object', () => {
    const pipeline = makePipeline()
    expect(Object.isFrozen(pipeline)).toBe(true)
  })

  it('prevents mutation of the pipeline object', () => {
    const pipeline = makePipeline()
    expect(() => {
      ;(pipeline as { name: string }).name = 'changed'
    }).toThrow()
  })

  it('preserves node map independence from the original', () => {
    const original = new Map([['a', makePass('a')]])
    const pipeline = makePipeline({ nodes: original })
    original.set('b', makePass('b'))
    expect(pipeline.nodes.size).toBe(1)
  })

  it('reports pipeline ownership on core node collision', () => {
    expect(() =>
      makePipeline({
        name: 'core',
        nodes: new Map([['shared', makePass('core-version')]]),
        plugins: [{ name: 'override', nodes: new Map([['shared', makePass('plugin-version')]]) }],
      }),
    ).toThrow(
      'Plugin "override" tried to inject node "shared", but "shared" was already registered by pipeline "core".',
    )
  })

  it('reports plugin ownership on plugin-to-plugin collision', () => {
    expect(() =>
      makePipeline({
        plugins: [
          { name: 'first', nodes: new Map([['x', makePass('first')]]) },
          { name: 'second', nodes: new Map([['x', makePass('second')]]) },
        ],
      }),
    ).toThrow(
      'Plugin "second" tried to inject node "x", but "x" was already registered by plugin "first".',
    )
  })

  it('uses declaration order when determining ownership', () => {
    expect(() =>
      makePipeline({
        plugins: [
          { name: 'first', nodes: new Map([['shared', makePass('a')]]) },
          { name: 'second', nodes: new Map([['shared', makePass('b')]]) },
        ],
      }),
    ).toThrow('registered by plugin "first"')
  })
})
