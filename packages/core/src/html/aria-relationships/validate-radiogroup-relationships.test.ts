import { describe, expect, it } from 'vitest'
import { validateAriaRadiogroupRelationships } from './validate-radiogroup-relationships'

describe('ARIA radiogroup relationships', () => {
  it('accepts radios structurally contained by a radiogroup', () => {
    expect(
      validateAriaRadiogroupRelationships([
        { id: 'group', props: { role: 'radiogroup' } },
        { id: 'wrapper', parentId: 'group', props: { role: 'group' } },
        { id: 'radio-a', parentId: 'wrapper', props: { role: 'radio', 'aria-checked': 'true' } },
        { id: 'radio-b', parentId: 'group', props: { role: 'radio', 'aria-checked': 'false' } },
      ]),
    ).toEqual([])
  })

  it('accepts radios explicitly owned through aria-owns', () => {
    expect(
      validateAriaRadiogroupRelationships([
        { id: 'group', props: { role: 'radiogroup', 'aria-owns': 'radio-a radio-b' } },
        { id: 'radio-a', props: { role: 'radio' } },
        { id: 'radio-b', props: { role: 'radio' } },
      ]),
    ).toEqual([])
  })

  it('warns when a radio has no radiogroup owner in the supplied scope', () => {
    expect(
      validateAriaRadiogroupRelationships([{ id: 'radio', props: { role: 'radio' } }]),
    ).toMatchObject([
      {
        code: 'radio-without-radiogroup-owner',
        sourceIndex: 0,
      },
    ])
  })

  it('warns when a radio is associated with multiple radiogroups', () => {
    expect(
      validateAriaRadiogroupRelationships([
        { id: 'group-a', props: { role: 'radiogroup', 'aria-owns': 'radio' } },
        { id: 'group-b', props: { role: 'radiogroup', 'aria-owns': 'radio' } },
        { id: 'radio', props: { role: 'radio' } },
      ]),
    ).toMatchObject([
      {
        code: 'radio-with-multiple-radiogroup-owners',
        sourceIndex: 2,
      },
    ])
  })

  it('ignores elements that are not radios', () => {
    expect(
      validateAriaRadiogroupRelationships([{ props: { role: 'checkbox' } }]),
    ).toEqual([])
  })
})
