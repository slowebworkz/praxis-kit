import { describe, expect, it } from 'vitest'
import { validateAriaIdReferences } from './validate-id-references'

const summary = (diagnostics: ReturnType<typeof validateAriaIdReferences>) =>
  diagnostics.map(({ code, attribute, sourceIndex, targetId }) => [
    code,
    attribute,
    sourceIndex,
    targetId,
  ])

describe('validateAriaIdReferences (relationship scope)', () => {
  it('accepts uniquely resolved references', () => {
    expect(
      validateAriaIdReferences([
        { id: 'label' },
        { id: 'popup' },
        { props: { 'aria-labelledby': 'label', 'aria-controls': 'popup' } },
      ]),
    ).toEqual([])
  })

  it('reports missing and ambiguous tokens per attribute, in attribute then token order', () => {
    expect(
      summary(
        validateAriaIdReferences([
          { id: 'dup' },
          { id: 'dup' },
          {
            props: {
              'aria-labelledby': 'gone dup',
              'aria-controls': 'nope',
              'aria-activedescendant': 'dup',
            },
          },
        ]),
      ),
    ).toEqual([
      ['missing-target', 'aria-labelledby', 2, 'gone'],
      ['ambiguous-target', 'aria-labelledby', 2, 'dup'],
      ['missing-target', 'aria-controls', 2, 'nope'],
      ['ambiguous-target', 'aria-activedescendant', 2, 'dup'],
    ])
  })

  it('uses stable message text', () => {
    const [missing, ambiguous] = validateAriaIdReferences([
      { id: 'dup' },
      { id: 'dup' },
      { props: { 'aria-controls': 'gone dup' } },
    ])

    expect(missing?.message).toBe('aria-controls references missing id "gone".')
    expect(ambiguous?.message).toBe('aria-controls references id "dup", which is not unique.')
    expect(missing).toMatchObject({ valid: false, severity: 'warning' })
  })

  it('ignores non-string and absent reference attributes', () => {
    expect(
      validateAriaIdReferences([{ props: { 'aria-controls': 7 } }, { props: {} }, {}]),
    ).toEqual([])
  })
})
