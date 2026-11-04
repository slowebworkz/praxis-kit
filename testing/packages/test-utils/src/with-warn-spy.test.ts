import { describe, expect, it } from 'vitest'
import { withWarnSpy } from './with-warn-spy'

const original = console.warn

describe('withWarnSpy', () => {
  it('silences and records warnings during a synchronous run, then restores', () => {
    withWarnSpy((warn) => {
      console.warn('quiet')
      expect(warn).toHaveBeenCalledWith('quiet')
      expect(console.warn).not.toBe(original)
    })
    expect(console.warn).toBe(original)
  })

  it('restores synchronously, so a caller that does not await sees the real console.warn', () => {
    withWarnSpy(() => {})
    expect(console.warn).toBe(original)
  })

  it('restores after a synchronous throw and rethrows', () => {
    expect(() =>
      withWarnSpy(() => {
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(console.warn).toBe(original)
  })

  it('stays active until an async run settles, then restores', async () => {
    await withWarnSpy(async (warn) => {
      await Promise.resolve()
      console.warn('late')
      expect(warn).toHaveBeenCalledWith('late')
    })
    expect(console.warn).toBe(original)
  })

  it('restores after an async rejection and propagates it', async () => {
    await expect(
      withWarnSpy(async () => {
        await Promise.resolve()
        throw new Error('async boom')
      }),
    ).rejects.toThrow('async boom')
    expect(console.warn).toBe(original)
  })
})
