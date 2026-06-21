import { describe, expect, it } from 'vitest'
import type { Pass } from './Pass'
import type { PassResult } from './PassResult'

interface TestContext {
  value: number
}

describe('Pass', () => {
  it('accepts a synchronous implementation', () => {
    const pass: Pass<TestContext> = {
      name: 'increment',
      execute(ctx) {
        const result: PassResult<TestContext> = { context: { value: ctx.value + 1 } }
        return result
      },
    }
    const result = pass.execute({ value: 1 })
    expect((result as PassResult<TestContext>).context?.value).toBe(2)
  })

  it('accepts an asynchronous implementation', async () => {
    const pass: Pass<TestContext> = {
      name: 'async-increment',
      execute: async (ctx) => ({ context: { value: ctx.value + 10 } }),
    }
    const result = await pass.execute({ value: 5 })
    expect(result.context?.value).toBe(15)
  })

  it('allows returning an empty PassResult', () => {
    const pass: Pass<TestContext> = {
      name: 'no-op',
      execute: () => ({}),
    }
    const result = pass.execute({ value: 0 }) as PassResult<TestContext>
    expect(result.context).toBeUndefined()
    expect(result.diagnostics).toBeUndefined()
  })

  it('allows returning diagnostics', () => {
    const pass: Pass<TestContext> = {
      name: 'validator',
      execute: () => ({
        diagnostics: [{ code: 'E001', message: 'invalid', severity: 'error' }],
      }),
    }
    const result = pass.execute({ value: 0 }) as PassResult<TestContext>
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics?.[0]?.code).toBe('E001')
  })
})
