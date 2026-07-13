import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { shallowObjectMerge, startPipeline } from '../index'
import { runPipeline } from './run-pipeline'

describe('runPipeline', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('runs the pipeline without exiting on success', async () => {
    const pipeline = startPipeline<object>({
      name: 'ok',
      strategy: 'sequential',
      merge: shallowObjectMerge,
    })
      .then({ name: 'noop', execute: () => ({}) })
      .build()

    await runPipeline(pipeline, {})

    expect(exitSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('logs the error and exits with code 1 when a pass rejects', async () => {
    const pipeline = startPipeline<object>({
      name: 'fail',
      strategy: 'sequential',
      merge: shallowObjectMerge,
    })
      .then({
        name: 'boom',
        execute: () => {
          throw new Error('boom')
        },
      })
      .build()

    await runPipeline(pipeline, {})

    expect(errorSpy).toHaveBeenCalledWith('boom')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('logs non-Error throws as-is', async () => {
    const pipeline = startPipeline<object>({
      name: 'fail-non-error',
      strategy: 'sequential',
      merge: shallowObjectMerge,
    })
      .then({
        name: 'boom',
        execute: () => {
          throw 'oops'
        },
      })
      .build()

    await runPipeline(pipeline, {})

    expect(errorSpy).toHaveBeenCalledWith('oops')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
