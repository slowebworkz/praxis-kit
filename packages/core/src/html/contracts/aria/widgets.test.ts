import { describe, expect, it } from 'vitest'

import type { AriaContext } from '../../../types'
import {
  checkboxContract,
  menuitemcheckboxContract,
  menuitemradioContract,
  optionContract,
  radioContract,
  tabContract,
  tabpanelContract,
} from './widgets'

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
    ['option', optionContract, 'aria-selected'],
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
    ['option', optionContract, 'aria-selected'],
    ['radio', radioContract, 'aria-checked'],
    ['checkbox', checkboxContract, 'aria-checked'],
  ] as const)('accepts role="%s" when %s is explicitly false', (_role, contract, attribute) => {
    expect(contract.aria![0]!(ctx({ [attribute]: false }))).toEqual([])
  })
})

describe('APG menu item checked states', () => {
  it.each([
    ['menuitemcheckbox', menuitemcheckboxContract],
    ['menuitemradio', menuitemradioContract],
  ] as const)('warns when role="%s" omits aria-checked', (role, contract) => {
    const rule = contract.aria![0]!

    expect(rule(ctx({}))).toMatchObject([
      {
        valid: false,
        severity: 'warning',
        diagnostic: {
          message: expect.stringContaining(`role="${role}" requires aria-checked`),
        },
      },
    ])
  })

  it.each([menuitemcheckboxContract, menuitemradioContract])(
    'accepts an explicit false checked state',
    (contract) => {
      expect(contract.aria![0]!(ctx({ 'aria-checked': false }))).toEqual([])
    },
  )
})
