import { describe, expect, it } from 'vitest'
import { validateAriaMenuRelationships } from './validate-menu-relationships'

describe('ARIA menu relationships', () => {
  it('accepts menu items structurally contained by a menu or menubar', () => {
    expect(
      validateAriaMenuRelationships([
        { id: 'menubar', props: { role: 'menubar' } },
        { id: 'item', parentId: 'menubar', props: { role: 'menuitem' } },
        { id: 'menu', props: { role: 'menu' } },
        { id: 'checkbox', parentId: 'menu', props: { role: 'menuitemcheckbox' } },
        { id: 'radio', parentId: 'menu', props: { role: 'menuitemradio' } },
      ]),
    ).toEqual([])
  })

  it('accepts group wrappers between menu and menu items', () => {
    expect(
      validateAriaMenuRelationships([
        { id: 'menu', props: { role: 'menu' } },
        { id: 'group', parentId: 'menu', props: { role: 'group' } },
        { id: 'item', parentId: 'group', props: { role: 'menuitem' } },
      ]),
    ).toEqual([])
  })

  it('accepts explicit aria-owns ownership', () => {
    expect(
      validateAriaMenuRelationships([
        { id: 'menu', props: { role: 'menu', 'aria-owns': 'item' } },
        { id: 'item', props: { role: 'menuitem' } },
      ]),
    ).toEqual([])
  })

  it('warns for menu item roles without a menu or menubar owner', () => {
    expect(
      validateAriaMenuRelationships([
        { id: 'orphan', props: { role: 'menuitem' } },
        { id: 'region', props: { role: 'region' } },
        { id: 'wrong-owner', parentId: 'region', props: { role: 'menuitemcheckbox' } },
      ]).map(({ code, sourceIndex }) => [code, sourceIndex]),
    ).toEqual([
      ['menuitem-without-menu-owner', 0],
      ['menuitem-without-menu-owner', 2],
    ])
  })

  it('does not count an outer menubar as a second owner for a nested submenu item', () => {
    expect(
      validateAriaMenuRelationships([
        { id: 'menubar', props: { role: 'menubar' } },
        {
          id: 'parent-item',
          parentId: 'menubar',
          props: { role: 'menuitem', 'aria-owns': 'submenu' },
        },
        { id: 'submenu', props: { role: 'menu' } },
        { id: 'child-item', parentId: 'submenu', props: { role: 'menuitem' } },
      ]),
    ).toEqual([])
  })

  it('warns when a menu item has multiple menu owners', () => {
    expect(
      validateAriaMenuRelationships([
        { id: 'first-menu', props: { role: 'menu', 'aria-owns': 'item' } },
        { id: 'second-menu', props: { role: 'menu', 'aria-owns': 'item' } },
        { id: 'item', props: { role: 'menuitem' } },
      ]).map(({ code, sourceIndex }) => [code, sourceIndex]),
    ).toContainEqual(['menuitem-with-multiple-menu-owners', 2])
  })
})
