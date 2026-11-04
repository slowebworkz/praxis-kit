import { describe, expect, it } from 'vitest'
import { createAriaReferenceIndex } from './id-reference-index'
import {
  GRID_CELL_ROLES,
  hasProp,
  hasRole,
  idOf,
  roleOf,
  unresolvedReference,
  warn,
} from './shared'

describe('relationship helpers', () => {
  it('prefers the top-level role over props.role', () => {
    expect(roleOf({ role: 'row', props: { role: 'grid' } })).toBe('row')
    expect(roleOf({ props: { role: 'grid' } })).toBe('grid')
    expect(roleOf({})).toBeUndefined()
  })

  it('matches roles against a set and ignores non-string roles', () => {
    expect(hasRole({ props: { role: 'gridcell' } }, GRID_CELL_ROLES)).toBe(true)
    expect(hasRole({ props: { role: 'row' } }, GRID_CELL_ROLES)).toBe(false)
    expect(hasRole({ props: { role: 7 } }, GRID_CELL_ROLES)).toBe(false)
  })

  it('detects own props regardless of value', () => {
    expect(hasProp({ props: { 'aria-selected': undefined } }, 'aria-selected')).toBe(true)
    expect(hasProp({ props: {} }, 'aria-selected')).toBe(false)
    expect(hasProp({}, 'aria-selected')).toBe(false)
  })

  it('resolves a diagnostic id from the top-level id, then props.id, ignoring empty values', () => {
    expect(idOf({ id: 'a', props: { id: 'b' } })).toBe('a')
    expect(idOf({ props: { id: 'b' } })).toBe('b')
    expect(idOf({ id: '' })).toBeUndefined()
    expect(idOf({})).toBeUndefined()
  })

  it('builds warnings and omits a falsy target id', () => {
    expect(warn('code', 2, 'message')).toEqual({
      valid: false,
      severity: 'warning',
      code: 'code',
      sourceIndex: 2,
      message: 'message',
    })
    expect(warn('code', 2, 'message', 'target')).toMatchObject({ targetId: 'target' })
    expect(warn('code', 2, 'message', undefined)).not.toHaveProperty('targetId')
    expect(warn('code', 2, 'message', '')).not.toHaveProperty('targetId')
  })

  it('describes missing and ambiguous references with the given subject', () => {
    const index = createAriaReferenceIndex([{ id: 'dup' }, { id: 'dup' }])
    const [missing, ambiguous] = index.resolveList('gone dup')

    expect(unresolvedReference(missing as never, 'aria-controls')).toEqual({
      code: 'missing-target',
      message: 'aria-controls references missing id "gone".',
    })
    expect(unresolvedReference(ambiguous as never, 'aria-controls')).toEqual({
      code: 'ambiguous-target',
      message: 'aria-controls references id "dup", which is not unique.',
    })
  })
})
