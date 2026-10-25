import { describe, expect, it } from 'vitest'

import type { AriaContext } from '../../../types'
import {
  checkboxContract,
  gridContract,
  listboxContract,
  menuitemContract,
  menuitemcheckboxContract,
  menuitemradioContract,
  optionContract,
  radioContract,
  tabContract,
  tabpanelContract,
  toolbarContract,
  treeContract,
  treeitemContract,
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

describe('APG menuitem naming', () => {
  it('warns when role="menuitem" has no accessible name', () => {
    expect(menuitemContract.aria![0]!(ctx({}))).toMatchObject([
      { valid: false, severity: 'warning' },
    ])
  })

  it.each(['aria-label', 'aria-labelledby'])(
    'accepts role="menuitem" named by %s',
    (attribute) => {
      expect(menuitemContract.aria![0]!(ctx({ [attribute]: 'Save' }))).toEqual([])
    },
  )
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

describe('APG tabpanel naming', () => {
  it('warns when role="tabpanel" has no accessible name', () => {
    expect(tabpanelContract.aria![0]!(ctx({}))).toMatchObject([
      { valid: false, severity: 'warning' },
    ])
  })

  it.each(['aria-label', 'aria-labelledby'])('accepts role="tabpanel" named by %s', (attribute) => {
    expect(tabpanelContract.aria![0]!(ctx({ [attribute]: 'x' }))).toEqual([])
  })
})

describe('APG listbox and tree relationship scope', () => {
  it.each([
    ['listbox', listboxContract],
    ['tree', treeContract],
  ] as const)(
    'keeps role="%s" relationship validation outside the single-element contract',
    (_role, contract) => {
      const rule = contract.aria![0]!

      // AriaContext has no descendant tree or document-wide ID map. These props
      // can be present, but their targets/relationships cannot be verified here.
      expect(
        rule(
          ctx({
            'aria-label': 'Items',
            'aria-activedescendant': 'active-item',
            'aria-multiselectable': false,
          }),
        ),
      ).toEqual([])
    },
  )
})

describe('APG treeitem naming', () => {
  it('warns when role="treeitem" has no accessible name', () => {
    expect(treeitemContract.aria![0]!(ctx({}))).toMatchObject([
      { valid: false, severity: 'warning' },
    ])
  })

  it.each(['aria-label', 'aria-labelledby'])('accepts role="treeitem" named by %s', (attribute) => {
    expect(treeitemContract.aria![0]!(ctx({ [attribute]: 'Folder' }))).toEqual([])
  })
})

describe('APG grid role coverage', () => {
  it('keeps grid validation at the accessible-name boundary', () => {
    const rule = gridContract.aria![0]!

    expect(
      rule(
        ctx({
          'aria-label': 'Search results',
          'aria-rowcount': 12,
          'aria-colcount': 4,
          'aria-activedescendant': 'result-1',
        }),
      ),
    ).toEqual([])
  })
})


describe('APG toolbar naming', () => {
  it('warns when role="toolbar" has no accessible name', () => {
    expect(toolbarContract.aria![0]!(ctx({}))).toMatchObject([
      { valid: false, severity: 'warning' },
    ])
  })

  it.each(['aria-label', 'aria-labelledby'])(
    'accepts role="toolbar" named by %s',
    (attribute) => {
      expect(toolbarContract.aria![0]!(ctx({ [attribute]: 'Formatting' }))).toEqual([])
    },
  )
})
