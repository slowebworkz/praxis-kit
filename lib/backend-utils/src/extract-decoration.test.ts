import { describe, expect, it } from 'vitest'
import { extractDecoration } from './extract-decoration'

describe('extractDecoration', () => {
  it('returns empty object for empty props', () => {
    expect(extractDecoration({})).toEqual({})
  })

  it('skips children and slot from attribute collection', () => {
    expect(extractDecoration({ children: {}, slot: 'test' })).toEqual({})
  })

  it('omits undefined and null attribute values', () => {
    expect(extractDecoration({ disabled: undefined, title: null })).toEqual({})
  })

  it('collects string attributes', () => {
    expect(extractDecoration({ id: 'foo', role: 'button' })).toEqual({
      attributes: { id: 'foo', role: 'button' },
    })
  })

  it('collects number attributes', () => {
    expect(extractDecoration({ tabIndex: -1 })).toEqual({
      attributes: { tabIndex: -1 },
    })
  })

  it('collects boolean attributes', () => {
    expect(extractDecoration({ disabled: true })).toEqual({
      attributes: { disabled: true },
    })
  })

  it('treats potential variants as attributes when no variantKeys provided', () => {
    expect(extractDecoration({ size: 'sm' })).toEqual({
      attributes: { size: 'sm' },
    })
  })

  it('routes variant keys to variants', () => {
    const variantKeys = new Set(['size', 'intent'])
    expect(extractDecoration({ size: 'sm', id: 'x' }, variantKeys)).toEqual({
      attributes: { id: 'x' },
      variants: { size: 'sm' },
    })
  })

  it('collects style entries from an object value', () => {
    expect(extractDecoration({ style: { color: 'red', fontSize: 14 } })).toEqual({
      styles: { color: 'red', fontSize: 14 },
    })
  })

  it('treats non-object style values as attributes', () => {
    // Non-objects skip the style branch and fall through to isAttributeValue
    expect(extractDecoration({ style: 'red' })).toEqual({ attributes: { style: 'red' } })
    expect(extractDecoration({ style: 42 })).toEqual({ attributes: { style: 42 } })
  })

  it('drops non-style values inside a style object', () => {
    expect(extractDecoration({ style: { color: null, display: 'block' } })).toEqual({
      styles: { display: 'block' },
    })
  })

  it('collects event listeners', () => {
    const onClick = () => {}
    expect(extractDecoration({ onClick })).toEqual({ listeners: { onClick } })
  })

  it('ignores non-function on* props — falls through to attribute classification', () => {
    expect(extractDecoration({ onClick: 'not-a-fn' })).toEqual({
      attributes: { onClick: 'not-a-fn' },
    })
  })

  it('captures ref on the decoration', () => {
    const ref = { current: null }
    expect(extractDecoration({ ref })).toEqual({ ref })
  })

  it('all extraction paths cooperate simultaneously', () => {
    const onClick = () => {}
    const ref = { current: null }
    expect(
      extractDecoration(
        { id: 'button', style: { color: 'red' }, onClick, size: 'lg', ref },
        new Set(['size']),
      ),
    ).toEqual({
      attributes: { id: 'button' },
      styles: { color: 'red' },
      listeners: { onClick },
      variants: { size: 'lg' },
      ref,
    })
  })
})
