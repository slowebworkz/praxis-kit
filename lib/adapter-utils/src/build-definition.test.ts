import { describe, expect, it } from 'vitest'
import { buildDefinition } from './build-definition'

describe('buildDefinition', () => {
  it('sets identity.id from name', () => {
    expect(buildDefinition('Button', 'button').identity.id).toBe('Button')
  })

  it('sets identity.name from name', () => {
    expect(buildDefinition('Button', 'button').identity.name).toBe('Button')
  })

  it('sets identity.tag from tag', () => {
    expect(buildDefinition('Button', 'button').identity.tag).toBe('button')
  })

  it('initializes empty capabilities', () => {
    expect(buildDefinition('Button', 'button').capabilities).toEqual({})
  })

  it('initializes empty metadata', () => {
    expect(buildDefinition('Button', 'button').metadata).toEqual({})
  })

  it('initializes empty diagnostics', () => {
    expect(buildDefinition('Button', 'button').diagnostics).toEqual([])
  })

  it('returns a fresh object each call', () => {
    const a = buildDefinition('A', 'div')
    const b = buildDefinition('A', 'div')
    expect(a).not.toBe(b)
    expect(a.capabilities).not.toBe(b.capabilities)
  })
})
