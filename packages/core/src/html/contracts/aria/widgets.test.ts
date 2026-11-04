import { describe, expect, it } from 'vitest'
import { AriaPolicyEngine } from '@praxis-kit/contract'
import { silentDiagnostics } from '@praxis-kit/diagnostics'

import type { AriaContext, AriaRule } from '../../../types'
import { requireAccessibleName } from '../../aria-rules'
import {
  alertdialogContract,
  checkboxContract,
  gridContract,
  listboxContract,
  menuContract,
  menubarContract,
  menuitemContract,
  menuitemcheckboxContract,
  menuitemradioContract,
  optionContract,
  radioContract,
  switchContract,
  tabContract,
  tablistContract,
  tabpanelContract,
  toolbarContract,
  treeContract,
  treegridContract,
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

describe('required widget states', () => {
  it.each([
    ['radio', radioContract, 'aria-checked'],
    ['checkbox', checkboxContract, 'aria-checked'],
    ['switch', switchContract, 'aria-checked'],
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

  it('words the tab requirement as APG guidance, since WAI-ARIA 1.2 only lists aria-selected as supported', () => {
    expect(tabContract.aria![0]!(ctx({}))).toMatchObject([
      {
        valid: false,
        severity: 'warning',
        diagnostic: {
          message: expect.stringMatching(
            /should set aria-selected \(APG tab pattern\).*supported, not required/,
          ),
        },
      },
    ])
  })

  it.each([
    ['tab', tabContract, 'aria-selected'],
    ['radio', radioContract, 'aria-checked'],
    ['checkbox', checkboxContract, 'aria-checked'],
    ['switch', switchContract, 'aria-checked'],
  ] as const)('accepts role="%s" when %s is explicitly false', (_role, contract, attribute) => {
    expect(contract.aria![0]!(ctx({ [attribute]: false }))).toEqual([])
  })
})

describe('contracts that carry no element-local rule', () => {
  // Content-named roles can't be checked without seeing children, option's aria-selected is the
  // engine's job, and toolbar/tablist/menu/menubar names aren't required by WAI-ARIA 1.2.
  it.each([
    ['menu', menuContract],
    ['menubar', menubarContract],
    ['menuitem', menuitemContract],
    ['treeitem', treeitemContract],
    ['option', optionContract],
    ['toolbar', toolbarContract],
    ['tablist', tablistContract],
  ] as const)('role="%s" has no aria rule', (_role, contract) => {
    expect(contract.aria).toEqual([])
  })

  it('toolbar, tablist, menu and menubar naming stays available as an opt-in rule', () => {
    expect(requireAccessibleName(ctx({}))).toMatchObject([{ valid: false, severity: 'warning' }])
    expect(requireAccessibleName(ctx({ 'aria-label': 'Formatting' }))).toEqual([])
  })
})

describe('APG optional menu item states', () => {
  it.each([
    { 'aria-label': 'Open submenu' },
    { 'aria-label': 'Open submenu', 'aria-haspopup': 'menu' },
    { 'aria-label': 'Open submenu', 'aria-haspopup': 'menu', 'aria-expanded': true },
    { 'aria-label': 'Unavailable action', 'aria-disabled': true },
    { 'aria-label': 'Available action', 'aria-disabled': false },
  ])('does not require conditional menuitem state attributes', (props) => {
    // menuitem carries no rule at all, so no combination of optional states can trip one.
    expect(menuitemContract.aria).toEqual([])
    expect(props).toBeDefined()
  })

  it('does not make submenu or disabled state attributes substitutes for checked state', () => {
    for (const contract of [menuitemcheckboxContract, menuitemradioContract]) {
      expect(
        contract.aria![0]!(
          ctx({
            'aria-label': 'Action',
            'aria-disabled': true,
            'aria-haspopup': 'menu',
            'aria-expanded': true,
          }),
        ),
      ).toMatchObject([
        {
          valid: false,
          diagnostic: { message: expect.stringContaining('aria-checked') },
        },
      ])
    }
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

describe('author-named dialog and grid roles', () => {
  it.each([
    ['alertdialog', alertdialogContract],
    ['treegrid', treegridContract],
  ] as const)('warns when role="%s" has no accessible name', (_role, contract) => {
    expect(contract.aria![0]!(ctx({}))).toMatchObject([{ valid: false, severity: 'warning' }])
  })

  it.each([
    ['alertdialog', alertdialogContract],
    ['treegrid', treegridContract],
  ] as const)('accepts role="%s" named by aria-label or aria-labelledby', (_role, contract) => {
    expect(contract.aria![0]!(ctx({ 'aria-label': 'x' }))).toEqual([])
    expect(contract.aria![0]!(ctx({ 'aria-labelledby': 'x' }))).toEqual([])
  })
})

describe('widget contracts end to end through the policy engine', () => {
  const codes = (
    contract: { aria?: readonly AriaRule[] },
    tag: string,
    props: Record<string, unknown>,
  ) =>
    new AriaPolicyEngine(silentDiagnostics, { rules: contract.aria ?? [] })
      .validate(tag as never, props as never)
      .violations.map((v) => v.diagnostic?.code)

  it('reports a missing aria-selected on role="option" exactly once', () => {
    expect(codes(optionContract, 'li', { role: 'option' })).toEqual(['ARIA2012'])
  })

  it.each(['menuitem', 'treeitem'] as const)(
    'accepts a content-named role="%s" without aria-label',
    (role) => {
      const contract = role === 'menuitem' ? menuitemContract : treeitemContract
      expect(codes(contract, 'li', { role })).toEqual([])
    },
  )

  it.each([
    ['toolbar', toolbarContract],
    ['tablist', tablistContract],
    ['menu', menuContract],
    ['menubar', menubarContract],
  ] as const)('does not require a name on role="%s"', (role, contract) => {
    expect(codes(contract, 'div', { role })).toEqual([])
  })
})
