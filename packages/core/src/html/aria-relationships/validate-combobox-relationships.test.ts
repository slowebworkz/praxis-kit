import { describe, expect, it } from 'vitest'
import { validateAriaComboboxRelationships } from './validate-combobox-relationships'

describe('ARIA combobox relationships', () => {
  it.each(['listbox', 'tree', 'grid', 'dialog'])('accepts a %s popup', (popupRole) => {
    expect(
      validateAriaComboboxRelationships([
        { id: 'combo', props: { role: 'combobox', 'aria-controls': 'popup' } },
        { id: 'popup', props: { role: popupRole } },
      ]),
    ).toEqual([])
  })

  it('does not require aria-controls when no popup reference is declared', () => {
    expect(validateAriaComboboxRelationships([{ props: { role: 'combobox' } }])).toEqual([])
  })

  it('warns when a referenced popup is missing', () => {
    expect(
      validateAriaComboboxRelationships([
        { id: 'combo', props: { role: 'combobox', 'aria-controls': 'missing' } },
      ]),
    ).toMatchObject([{ code: 'missing-target', sourceIndex: 0, targetId: 'missing' }])
  })

  it('warns when a referenced popup ID is ambiguous', () => {
    expect(
      validateAriaComboboxRelationships([
        { id: 'combo', props: { role: 'combobox', 'aria-controls': 'popup' } },
        { id: 'popup', props: { role: 'listbox' } },
        { id: 'popup', props: { role: 'dialog' } },
      ]),
    ).toMatchObject([{ code: 'ambiguous-target', sourceIndex: 0, targetId: 'popup' }])
  })

  it('warns when a uniquely resolved target has an unsupported popup role', () => {
    expect(
      validateAriaComboboxRelationships([
        { id: 'combo', props: { role: 'combobox', 'aria-controls': 'target' } },
        { id: 'target', props: { role: 'region' } },
      ]),
    ).toMatchObject([{ code: 'wrong-popup-role', sourceIndex: 0, targetId: 'target' }])
  })

  it('ignores aria-controls on elements that are not comboboxes', () => {
    expect(
      validateAriaComboboxRelationships([
        { id: 'button', props: { role: 'button', 'aria-controls': 'target' } },
        { id: 'target', props: { role: 'region' } },
      ]),
    ).toEqual([])
  })
})
