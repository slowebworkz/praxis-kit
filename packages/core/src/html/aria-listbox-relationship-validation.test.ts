import { describe, expect, it } from 'vitest'
import { validateAriaListboxRelationships } from './aria-listbox-relationship-validation'

describe('validateAriaListboxRelationships', () => {
  it('accepts a consistent aria-selected selection model', () => {
    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox' } },
        { parentIndex: 0, props: { role: 'option', 'aria-selected': true } },
        { parentIndex: 0, props: { role: 'option', 'aria-selected': false } },
      ]),
    ).toEqual([])
  })

  it('accepts a consistent aria-checked selection model', () => {
    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox' } },
        { parentIndex: 0, props: { role: 'option', 'aria-checked': true } },
        { parentIndex: 0, props: { role: 'option', 'aria-checked': false } },
      ]),
    ).toEqual([])
  })

  it('warns when owned options mix aria-selected and aria-checked', () => {
    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox' } },
        { parentIndex: 0, props: { role: 'option', 'aria-selected': false } },
        { parentIndex: 0, props: { role: 'option', 'aria-checked': false } },
      ]),
    ).toEqual([{ elementIndex: 0, issue: 'mixed-option-selection-state' }])
  })

  it('does not mix selection models across separate listboxes', () => {
    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox' } },
        { parentIndex: 0, props: { role: 'option', 'aria-selected': false } },
        { props: { role: 'listbox' } },
        { parentIndex: 2, props: { role: 'option', 'aria-checked': false } },
      ]),
    ).toEqual([])
  })
  it('accepts options nested under a listbox and a valid active descendant', () => {
    expect(
      validateAriaListboxRelationships([
        { id: 'list', props: { role: 'listbox', 'aria-activedescendant': 'option-a' } },
        { id: 'option-a', parentIndex: 0, props: { role: 'option' } },
      ]),
    ).toEqual([])
  })

  it('accepts options owned through aria-owns', () => {
    expect(
      validateAriaListboxRelationships([
        {
          id: 'list',
          props: { role: 'listbox', 'aria-owns': 'option-a', 'aria-activedescendant': 'option-a' },
        },
        { id: 'option-a', props: { role: 'option' } },
      ]),
    ).toEqual([])
  })

  it('accepts options inside a group explicitly owned by a listbox', () => {
    expect(
      validateAriaListboxRelationships([
        {
          id: 'list',
          props: {
            role: 'listbox',
            'aria-owns': 'group',
            'aria-activedescendant': 'option-a',
          },
        },
        { id: 'group', props: { role: 'group' } },
        { id: 'option-a', parentIndex: 1, props: { role: 'option' } },
      ]),
    ).toEqual([])
  })

  it('does not treat descendants of an unowned group as listbox-owned', () => {
    expect(
      validateAriaListboxRelationships([
        { id: 'list', props: { role: 'listbox', 'aria-owns': 'other-group' } },
        { id: 'group', props: { role: 'group' } },
        { id: 'option-a', parentIndex: 1, props: { role: 'option' } },
      ]),
    ).toEqual([{ elementIndex: 2, issue: 'option-without-listbox-owner' }])
  })

  it('reports an option without a listbox owner', () => {
    expect(
      validateAriaListboxRelationships([{ id: 'option-a', props: { role: 'option' } }]),
    ).toEqual([{ elementIndex: 0, issue: 'option-without-listbox-owner' }])
  })

  it('reports an active descendant with a non-option role', () => {
    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox', 'aria-activedescendant': 'target' } },
        { id: 'target', parentIndex: 0, props: { role: 'button' } },
      ]),
    ).toEqual([
      {
        elementIndex: 0,
        issue: 'active-descendant-not-option',
        reference: 'target',
        targetIndex: 1,
      },
    ])
  })

  it('reports an active descendant outside the listbox ownership scope', () => {
    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox', 'aria-activedescendant': 'target' } },
        { id: 'target', parentIndex: 2, props: { role: 'option' } },
        { props: { role: 'listbox' } },
      ]),
    ).toEqual([
      {
        elementIndex: 0,
        issue: 'active-descendant-not-owned',
        reference: 'target',
        targetIndex: 1,
      },
    ])
  })

  it('reports missing and ambiguous active descendant references', () => {
    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox', 'aria-activedescendant': 'missing' } },
      ]),
    ).toEqual([{ elementIndex: 0, issue: 'active-descendant-missing', reference: 'missing' }])

    expect(
      validateAriaListboxRelationships([
        { props: { role: 'listbox', 'aria-activedescendant': 'duplicate' } },
        { id: 'duplicate', parentIndex: 0, props: { role: 'option' } },
        { id: 'duplicate', parentIndex: 0, props: { role: 'option' } },
      ]),
    ).toEqual([{ elementIndex: 0, issue: 'active-descendant-ambiguous', reference: 'duplicate' }])
  })
})
