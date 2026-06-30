import { describe, expect, it } from 'vitest'
import type { MergeStrategy } from '@pk2/pipeline'
import type { Pass, Plugin, PipelineOptions } from './types'
import { createPipeline } from './create-pipeline'

interface TestContext {
  value: number
}

const makePass = (name: string): Pass<TestContext> => ({
  name,
  execute: (ctx) => ({ context: { value: ctx.value + 1 } }),
})

const makePlugin = (name: string, passes: Pass<TestContext>[]): Plugin<TestContext> => ({
  name,
  create: () => passes,
})

const identityMerge: MergeStrategy<TestContext> = {
  merge: (previous, incoming) => ({ ...previous, ...incoming }),
}

function makePipeline(overrides: Partial<PipelineOptions<TestContext>> = {}) {
  return createPipeline<TestContext>({
    name: 'test',
    strategy: 'sequential',
    merge: identityMerge,
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

  it('injects processors returned by plugin.create()', () => {
    const pipeline = makePipeline({
      nodes: new Map([['core', makePass('core')]]),
      plugins: [makePlugin('plugin', [makePass('extra')])],
    })
    expect(pipeline.nodes.size).toBe(2)
    expect(pipeline.nodes.has('core')).toBe(true)
    expect(pipeline.nodes.has('extra')).toBe(true)
  })

  it('plugin.create() returning empty array contributes nothing', () => {
    const pipeline = makePipeline({
      nodes: new Map([['core', makePass('core')]]),
      plugins: [makePlugin('empty', [])],
    })
    expect(pipeline.nodes.size).toBe(1)
    expect(pipeline.nodes.has('core')).toBe(true)
  })

  it('plugin.create() is called once at pipeline construction time', () => {
    let calls = 0
    const plugin: Plugin<TestContext> = {
      name: 'counted',
      create() {
        calls++
        return [makePass('p')]
      },
    }
    makePipeline({ plugins: [plugin] })
    expect(calls).toBe(1)
  })

  it('does not mutate the original nodes map', () => {
    const original = new Map([['a', makePass('a')]])
    makePipeline({
      nodes: original,
      plugins: [makePlugin('p', [makePass('b')])],
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
        nodes: new Map([['shared', makePass('shared')]]),
        plugins: [makePlugin('override', [makePass('shared')])],
      }),
    ).toThrow(
      'Plugin "override" tried to inject node "shared", but "shared" was already registered by pipeline "core".',
    )
  })

  it('reports plugin ownership on plugin-to-plugin collision', () => {
    expect(() =>
      makePipeline({
        plugins: [makePlugin('first', [makePass('x')]), makePlugin('second', [makePass('x')])],
      }),
    ).toThrow(
      'Plugin "second" tried to inject node "x", but "x" was already registered by plugin "first".',
    )
  })

  it('uses declaration order when determining ownership', () => {
    expect(() =>
      makePipeline({
        plugins: [
          makePlugin('first', [makePass('shared')]),
          makePlugin('second', [makePass('shared')]),
        ],
      }),
    ).toThrow('registered by plugin "first"')
  })

  it('plugin contributing multiple processors injects all of them', () => {
    const pipeline = makePipeline({
      plugins: [makePlugin('multi', [makePass('x'), makePass('y'), makePass('z')])],
    })
    expect(pipeline.nodes.size).toBe(3)
    expect([...pipeline.nodes.keys()]).toEqual(['x', 'y', 'z'])
  })
})
