import { describe, it, expect } from 'vitest'
import { applyDisplayName } from './apply-display-name'

describe('applyDisplayName', () => {
  it('sets displayName on the target object', () => {
    const comp = {}
    applyDisplayName(comp, 'MyButton')
    expect((comp as { displayName: string }).displayName).toBe('MyButton')
  })

  it('falls back to PolymorphicComponent when name is undefined', () => {
    const comp = {}
    applyDisplayName(comp, undefined)
    expect((comp as { displayName: string }).displayName).toBe('PolymorphicComponent')
  })

  it('overwrites an existing displayName', () => {
    const comp = { displayName: 'Old' }
    applyDisplayName(comp, 'New')
    expect(comp.displayName).toBe('New')
  })

  it('does not return a value', () => {
    expect(applyDisplayName({}, 'X')).toBeUndefined()
  })
})
