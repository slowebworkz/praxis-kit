import { describe, expect, it } from 'vitest'
import { composePipelines } from './compose-pipelines'
import type { Pipeline } from './types'

const double: Pipeline<[number], number> = (n) => n * 2
const toString: Pipeline<[number], string> = (n) => `value:${n}`
const addOne: Pipeline<[number], number> = (n) => n + 1

describe('composePipelines()', () => {
  it('passes the output of the first pipeline into the second', () => {
    const pipeline = composePipelines(double, toString)
    expect(pipeline(5)).toBe('value:10')
  })

  it('preserves multi-argument input tuples', () => {
    const sum: Pipeline<[number, number], number> = (a, b) => a + b
    const pipeline = composePipelines(sum, toString)
    expect(pipeline(2, 3)).toBe('value:5')
  })

  it('returns a pipeline that can be composed again', () => {
    const doubledThenAddedOne = composePipelines(double, addOne)
    const doubledThenAddedOneThenStringified = composePipelines(doubledThenAddedOne, toString)
    expect(doubledThenAddedOneThenStringified(5)).toBe('value:11')
  })

  it('is associative — grouping the composition differently produces the same result', () => {
    const left = composePipelines(composePipelines(double, addOne), toString)
    const right = composePipelines(double, composePipelines(addOne, toString))
    expect(left(5)).toBe(right(5))
    expect(left(5)).toBe('value:11')
  })
})
