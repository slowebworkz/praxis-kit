import { describe, expect, it } from 'vitest'

import type { AriaContext } from '../../../types'
import { checkboxContract, radioContract, tabContract } from './widgets'

function ctx(props: Record<string, unknown>): AriaContext {
  return {
    tag: 'div',
    props,
    implicitRole: undefined,
    effectiveRole: undefined,
  } as unknown as AriaContext
}

describe('APG required widget states', () => {
  it.each([
    ['tab', tabContract, 'aria-selected'],
    ['radio', radioContract, 'aria-checked'],
    ['checkbox', checkboxContract, 'aria-checked'],
  ] as const)('warns when role="%s" omits %s', (role, contract, attribute) => {
    const rule = contract.aria![0]!

    expect(rule(ctx({}))).toMatchObject([
      {
        valid: false,
        severity: 'warning',
        diagnostic: {
          message: expect.stringContaining(`role="${role}" requires ${attribute}`),
        },
      },
    ])
  })

  it.each([
    ['tab', tabContract, 'aria-selected'],
    ['radio', radioContract, 'aria-checked'],
    ['checkbox', checkboxContract, 'aria-checked'],
  ] as const)('accepts role="%s" when %s is explicitly false', (_role, contract, attribute) => {
    expect(contract.aria![0]!(ctx({ [attribute]: false }))).toEqual([])
  })
})
