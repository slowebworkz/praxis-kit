import { describe, expect, it } from 'vitest'
import { applyPropNormalizers } from './apply-prop-normalizers'
import type { PropNormalizer } from '@praxis-kit/core'

describe('applyPropNormalizers — no matching tag', () => {
  it('returns props unchanged for non-form elements', () => {
    const props = { disabled: true, className: 'btn' }
    expect(applyPropNormalizers('div', props)).toEqual(props)
  })

  it('returns props unchanged for unknown tag', () => {
    const props = { disabled: true }
    expect(applyPropNormalizers('my-element', props)).toEqual(props)
  })
})

describe('applyPropNormalizers — HTML built-ins', () => {
  it('adds aria-disabled and data-disabled when disabled on button', () => {
    const result = applyPropNormalizers('button', { disabled: true })
    expect(result['aria-disabled']).toBe('true')
    expect(result['data-disabled']).toBe('')
  })

  it('does not add aria-disabled when disabled is falsy on button', () => {
    const result = applyPropNormalizers('button', { disabled: false })
    expect(result['aria-disabled']).toBeUndefined()
  })

  it('does not override explicit aria-disabled on button', () => {
    const result = applyPropNormalizers('button', { disabled: true, 'aria-disabled': 'false' })
    expect(result['aria-disabled']).toBe('false')
    expect(result['data-disabled']).toBe('')
  })

  it('adds aria-readonly and data-readonly when readOnly on input', () => {
    const result = applyPropNormalizers('input', { readOnly: true })
    expect(result['aria-readonly']).toBe('true')
    expect(result['data-readonly']).toBe('')
  })

  it('adds aria-invalid and data-invalid when invalid on input', () => {
    const result = applyPropNormalizers('input', { invalid: true })
    expect(result['aria-invalid']).toBe('true')
    expect(result['data-invalid']).toBe('')
  })

  it('applies all applicable normalizers on input with multiple states', () => {
    const result = applyPropNormalizers('input', { disabled: true, readOnly: true, invalid: true })
    expect(result['aria-disabled']).toBe('true')
    expect(result['aria-readonly']).toBe('true')
    expect(result['aria-invalid']).toBe('true')
  })

  it('applies disabledProps on select', () => {
    const result = applyPropNormalizers('select', { disabled: true })
    expect(result['aria-disabled']).toBe('true')
  })

  it('applies disabledProps and readonlyProps on textarea', () => {
    const result = applyPropNormalizers('textarea', { disabled: true, readOnly: true })
    expect(result['aria-disabled']).toBe('true')
    expect(result['aria-readonly']).toBe('true')
  })

  it('applies disabledProps on fieldset', () => {
    const result = applyPropNormalizers('fieldset', { disabled: true })
    expect(result['aria-disabled']).toBe('true')
  })
})

describe('applyPropNormalizers — ordering: HTML built-ins run before additional', () => {
  it('additional normalizer sees aria-disabled already set by the built-in', () => {
    const seen: Array<string | undefined> = []
    const checkAria: PropNormalizer = (props) => {
      seen.push(props['aria-disabled'] as string | undefined)
      return {}
    }
    applyPropNormalizers('button', { disabled: true }, [checkAria])
    expect(seen).toEqual(['true'])
  })

  it('additional normalizer can intentionally override a built-in', () => {
    const override: PropNormalizer = () => ({ 'aria-disabled': 'false' })
    const result = applyPropNormalizers('button', { disabled: true }, [override])
    expect(result['aria-disabled']).toBe('false')
  })
})

describe('applyPropNormalizers — additional (enforcement.props)', () => {
  const addDataCustom: PropNormalizer = ({ custom }) => (custom ? { 'data-custom': '' } : {})

  it('applies additional normalizer on non-form element', () => {
    const result = applyPropNormalizers('div', { custom: true }, [addDataCustom])
    expect(result['data-custom']).toBe('')
  })

  it('chains three additional normalizers, each seeing the previous result', () => {
    const first: PropNormalizer = () => ({ a: '1' })
    const second: PropNormalizer = (props) => ({ b: props['a'] })
    const third: PropNormalizer = (props) => ({ c: props['b'] })
    const result = applyPropNormalizers('div', {}, [first, second, third])
    expect(result['a']).toBe('1')
    expect(result['b']).toBe('1')
    expect(result['c']).toBe('1')
  })
})

describe('applyPropNormalizers — identity fast path', () => {
  it('returns props unchanged (by value) when no normalizers apply', () => {
    const props = { className: 'btn' }
    expect(applyPropNormalizers('div', props)).toEqual(props)
    expect(applyPropNormalizers('span', props, [])).toEqual(props)
  })
})
