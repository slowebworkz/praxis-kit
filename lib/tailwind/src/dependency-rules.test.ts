import { describe, expect, it } from 'vitest'
import { defaultDependencyRules } from './dependency-rules'

describe('defaultDependencyRules — flex', () => {
  const { flex } = defaultDependencyRules

  it.each(['flex-1', 'flex-auto', 'flex-none', 'flex-col', 'flex-row'])('matches %s', (cls) => {
    expect(flex.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['grow', 'grow-0'])('matches %s', (cls) => {
    expect(flex.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['shrink', 'shrink-0'])('matches %s', (cls) => {
    expect(flex.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['basis-0', 'basis-full', 'basis-1/2'])('matches %s', (cls) => {
    expect(flex.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['grid-cols-2', 'col-span-1', 'gap-4'])('does not match %s', (cls) => {
    expect(flex.some((r) => r.test(cls))).toBe(false)
  })
})

describe('defaultDependencyRules — grid', () => {
  const { grid } = defaultDependencyRules

  it.each(['grid-cols-2', 'grid-rows-3', 'grid-flow-row'])('matches %s', (cls) => {
    expect(grid.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['col-span-2', 'col-start-1', 'col-end-3'])('matches %s', (cls) => {
    expect(grid.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['row-span-2', 'row-start-1', 'row-end-3'])('matches %s', (cls) => {
    expect(grid.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['auto-cols-min', 'auto-cols-fr', 'auto-rows-min', 'auto-rows-fr'])(
    'matches %s',
    (cls) => {
      expect(grid.some((r) => r.test(cls))).toBe(true)
    },
  )

  it.each(['flex-1', 'grow', 'shrink', 'basis-full'])('does not match %s', (cls) => {
    expect(grid.some((r) => r.test(cls))).toBe(false)
  })
})
