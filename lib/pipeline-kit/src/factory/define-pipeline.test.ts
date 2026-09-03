import { describe, expect, it, vi } from 'vitest'
import { definePipeline } from './define-pipeline'
import type { PipelineFactory } from './types'

type Resolved = { defaultTag: string }

describe('definePipeline()', () => {
  it('builds a Pipeline by calling the factory with the resolved config', () => {
    const factory: PipelineFactory<Resolved, [string | undefined], string> = (resolved) => {
      return (as) => as ?? resolved.defaultTag
    }
    const createTagPipeline = definePipeline(factory)
    const resolveTag = createTagPipeline(Object.freeze({ defaultTag: 'div' }))

    expect(resolveTag(undefined)).toBe('div')
    expect(resolveTag('span')).toBe('span')
  })

  it('calls the underlying factory exactly once per distinct resolved reference', () => {
    const spy = vi.fn<PipelineFactory<Resolved, [], string>>(
      (resolved) => () => resolved.defaultTag,
    )
    const createTagPipeline = definePipeline(spy)
    const resolved = Object.freeze({ defaultTag: 'div' })

    createTagPipeline(resolved)
    createTagPipeline(resolved)
    createTagPipeline(resolved)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('returns the identical Pipeline reference on repeat calls with the same resolved object', () => {
    const factory: PipelineFactory<Resolved, [], string> = (resolved) => () => resolved.defaultTag
    const createTagPipeline = definePipeline(factory)
    const resolved = Object.freeze({ defaultTag: 'div' })

    expect(createTagPipeline(resolved)).toBe(createTagPipeline(resolved))
  })

  it('rebuilds when given a different resolved object', () => {
    const spy = vi.fn<PipelineFactory<Resolved, [], string>>(
      (resolved) => () => resolved.defaultTag,
    )
    const createTagPipeline = definePipeline(spy)

    createTagPipeline(Object.freeze({ defaultTag: 'div' }))
    createTagPipeline(Object.freeze({ defaultTag: 'span' }))

    expect(spy).toHaveBeenCalledTimes(2)
  })
})
