import { describe, expect, it } from 'vitest'

import { mergeProps } from './merge-props'

describe('mergeProps()', () => {
  it('caller props win over defaults on collision', () => {
    expect(mergeProps({ size: 'md' }, { size: 'lg' })).toEqual({ size: 'lg' })
  })

  it('keeps a default when the caller omits the key entirely', () => {
    expect(mergeProps({ size: 'md' }, {})).toEqual({ size: 'md' })
  })

  it('adds caller-only props the defaults never had', () => {
    expect(mergeProps({ size: 'md' }, { intent: 'ghost' })).toEqual({
      size: 'md',
      intent: 'ghost',
    })
  })

  it('falls back to the default when the caller passes the key as explicit undefined', () => {
    expect(mergeProps({ size: 'md' }, { size: undefined })).toEqual({ size: 'md' })
  })

  it('falls back to the default when the caller passes the key as explicit null', () => {
    expect(mergeProps({ size: 'md' }, { size: null as never })).toEqual({ size: 'md' })
  })

  it('has no default to fall back to: an explicit undefined caller prop stays absent', () => {
    expect(mergeProps(undefined, { size: undefined })).toEqual({})
  })

  it('treats a missing defaultProps object as an empty set of defaults', () => {
    expect(mergeProps(undefined, { size: 'lg' })).toEqual({ size: 'lg' })
  })

  it('does not mutate either input', () => {
    const defaults = { size: 'md' }
    const props = { intent: 'ghost' }
    mergeProps(defaults, props)
    expect(defaults).toEqual({ size: 'md' })
    expect(props).toEqual({ intent: 'ghost' })
  })
})
