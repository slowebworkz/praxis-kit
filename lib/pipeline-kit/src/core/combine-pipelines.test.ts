import { describe, expect, it, vi } from 'vitest'
import { allPipelines, anyPipeline } from './combine-pipelines'
import type { Pipeline } from './types'

describe('allPipelines()', () => {
  it('runs every pipeline against the same args and collects outputs in order', () => {
    const double: Pipeline<[number], number> = (n) => n * 2
    const isEven: Pipeline<[number], boolean> = (n) => n % 2 === 0
    const label: Pipeline<[number], string> = (n) => `n=${n}`

    const combined = allPipelines<[number], [number, boolean, string]>([double, isEven, label])
    const [doubled, even, text] = combined(4)

    expect(doubled).toBe(8)
    expect(even).toBe(true)
    expect(text).toBe('n=4')
  })

  it('passes the identical argument list to every pipeline', () => {
    const first = vi.fn((n: number) => n * 2)
    const second = vi.fn((n: number) => n % 2 === 0)
    const third = vi.fn((n: number) => `n=${n}`)

    const combined = allPipelines<[number], [number, boolean, string]>([first, second, third])
    combined(4)

    expect(first).toHaveBeenCalledWith(4)
    expect(second).toHaveBeenCalledWith(4)
    expect(third).toHaveBeenCalledWith(4)
  })

  it('supports multi-argument pipelines, not just unary ones', () => {
    const sum: Pipeline<[number, number], number> = (a, b) => a + b
    const product: Pipeline<[number, number], number> = (a, b) => a * b

    const combined = allPipelines<[number, number], [number, number]>([sum, product])

    expect(combined(2, 3)).toEqual([5, 6])
  })

  it('returns one result per pipeline, in tuple order', () => {
    const toNumber: Pipeline<[string], number> = (s) => Number(s)
    const toUpper: Pipeline<[string], string> = (s) => s.toUpperCase()

    const combined = allPipelines<[string], [number, string]>([toNumber, toUpper])
    const [n, s] = combined('4')

    expect(n).toBe(4)
    expect(s).toBe('4')
  })
})

describe('anyPipeline()', () => {
  it('returns the first defined result', () => {
    const first: Pipeline<[string], number | undefined> = () => undefined
    const second: Pipeline<[string], number | undefined> = (tag) => (tag === 'div' ? 1 : undefined)
    const third: Pipeline<[string], number | undefined> = () => 99

    const combined = anyPipeline([first, second, third])
    expect(combined('div')).toBe(1)
  })

  it('fully specifies evaluation order: earlier pipelines run, later ones do not', () => {
    const first = vi.fn<Pipeline<[string], number | undefined>>(() => undefined)
    const second = vi.fn<Pipeline<[string], number | undefined>>(() => 42)
    const third = vi.fn<Pipeline<[string], number | undefined>>(() => 99)

    const combined = anyPipeline([first, second, third])

    expect(combined('x')).toBe(42)
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
    expect(third).not.toHaveBeenCalled()
  })

  it('returns undefined when every pipeline returns undefined', () => {
    const first: Pipeline<[string], number | undefined> = () => undefined
    const second: Pipeline<[string], number | undefined> = () => undefined

    const combined = anyPipeline([first, second])
    expect(combined('anything')).toBeUndefined()
  })
})
