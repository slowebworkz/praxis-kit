import { describe, expect, it } from 'vitest'

import { validateAriaIdReferences } from './aria-reference-validation'

describe('validateAriaIdReferences', () => {
  it('accepts references that resolve to exactly one element', () => {
    expect(
      validateAriaIdReferences([
        { id: 'label' },
        { id: 'panel' },
        {
          id: 'control',
          props: {
            'aria-labelledby': 'label',
            'aria-controls': 'panel',
            'aria-activedescendant': 'panel',
          },
        },
      ]),
    ).toEqual([])
  })

  it('reports each missing token in a whitespace-separated reference list', () => {
    expect(
      validateAriaIdReferences([
        { id: 'label' },
        { props: { 'aria-labelledby': 'label missing\talso-missing' } },
      ]),
    ).toEqual([
      {
        sourceIndex: 1,
        attribute: 'aria-labelledby',
        reference: 'missing',
        resolution: { status: 'missing', id: 'missing' },
      },
      {
        sourceIndex: 1,
        attribute: 'aria-labelledby',
        reference: 'also-missing',
        resolution: { status: 'missing', id: 'also-missing' },
      },
    ])
  })

  it('reports duplicate IDs as ambiguous instead of choosing a target', () => {
    const first = { id: 'duplicate' }
    const second = { id: 'duplicate' }

    expect(
      validateAriaIdReferences([first, second, { props: { 'aria-controls': 'duplicate' } }]),
    ).toEqual([
      {
        sourceIndex: 2,
        attribute: 'aria-controls',
        reference: 'duplicate',
        resolution: { status: 'ambiguous', id: 'duplicate', targets: [first, second] },
      },
    ])
  })

  it('checks only the three supported attributes and ignores non-string values', () => {
    expect(
      validateAriaIdReferences([
        {
          props: {
            'aria-labelledby': false,
            'aria-controls': '',
            'aria-activedescendant': null,
            'aria-describedby': 'not-indexed',
          },
        },
      ]),
    ).toEqual([])
  })

  it('returns no diagnostics when no reference attributes are present', () => {
    expect(validateAriaIdReferences([{ id: 'one' }, { props: { role: 'button' } }])).toEqual([])
  })
})
