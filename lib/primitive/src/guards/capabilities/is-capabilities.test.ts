import { describe, it, expect } from 'vitest'
import { isCapabilities, isCapability, isCapabilityMap } from './is-capabilities'

// ── isCapability ──────────────────────────────────────────────────────────────

describe('isCapability', () => {
  it('accepts an empty object', () => {
    expect(isCapability({})).toBe(true)
  })

  it('accepts createClassPipeline without AriaEngine', () => {
    expect(isCapability({ createClassPipeline() {} })).toBe(true)
  })

  it('accepts AriaEngine without createClassPipeline', () => {
    expect(isCapability({ AriaEngine() {} })).toBe(true)
  })

  it('accepts both properties together', () => {
    expect(isCapability({ createClassPipeline() {}, AriaEngine() {} })).toBe(true)
  })

  it('allows undefined properties (treated as absent)', () => {
    expect(isCapability({ createClassPipeline: undefined, AriaEngine: undefined })).toBe(true)
  })

  it('rejects a non-function createClassPipeline', () => {
    expect(isCapability({ createClassPipeline: 123 })).toBe(false)
  })

  it('rejects a non-function AriaEngine', () => {
    expect(isCapability({ AriaEngine: {} })).toBe(false)
  })

  it('rejects null createClassPipeline', () => {
    expect(isCapability({ createClassPipeline: null })).toBe(false)
  })

  it('rejects null AriaEngine', () => {
    expect(isCapability({ AriaEngine: null })).toBe(false)
  })

  // Unknown string keys and symbol keys are ignored — Capabilities is open.
  it('accepts extra unknown string properties', () => {
    expect(isCapability({ createClassPipeline() {}, foo: 123, bar: 'baz' })).toBe(true)
  })

  it('accepts symbol properties', () => {
    expect(isCapability({ [Symbol('foo')]: 123 })).toBe(true)
  })

  // isRecord uses isPlainObject (proto must be Object.prototype or null), so
  // objects with a custom prototype are rejected even if they carry the right keys.
  it('rejects objects with a non-plain prototype', () => {
    const proto = { createClassPipeline() {} }
    const value = Object.create(proto)
    expect(isCapability(value)).toBe(false)
  })

  it.each([null, undefined, 0, 42, '', true, [], () => {}])('rejects %p', (value) => {
    expect(isCapability(value)).toBe(false)
  })
})

// ── isCapabilityMap ───────────────────────────────────────────────────────────

describe('isCapabilityMap', () => {
  it('accepts an empty object', () => {
    expect(isCapabilityMap({})).toBe(true)
  })

  it('accepts a map of valid capabilities', () => {
    expect(
      isCapabilityMap({
        react: { createClassPipeline() {} },
        vue: { AriaEngine() {} },
      }),
    ).toBe(true)
  })

  it('accepts capability objects with extra properties', () => {
    expect(
      isCapabilityMap({
        react: { createClassPipeline() {}, foo: 123 },
      }),
    ).toBe(true)
  })

  it('rejects when one entry has an invalid property', () => {
    expect(
      isCapabilityMap({
        react: { createClassPipeline() {} },
        bad: { createClassPipeline: 42 },
      }),
    ).toBe(false)
  })

  it('rejects array values in entries', () => {
    expect(isCapabilityMap({ react: [] })).toBe(false)
  })

  it.each([null, undefined, 42, '', []])('rejects %p', (value) => {
    expect(isCapabilityMap(value)).toBe(false)
  })
})

// ── isCapabilities (alias) ────────────────────────────────────────────────────

describe('isCapabilities', () => {
  it('is an alias for isCapability', () => {
    expect(isCapabilities({ createClassPipeline() {} })).toBe(true)
    expect(isCapabilities(42)).toBe(false)
  })
})
