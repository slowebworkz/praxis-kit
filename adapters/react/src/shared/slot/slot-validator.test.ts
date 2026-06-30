import { describe, it, expect, vi, afterEach } from 'vitest'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'
import { SlotValidator } from './slot-validator'

afterEach(() => vi.restoreAllMocks())

describe('assertExclusive', () => {
  it('throws with the component name when strict is throw', () => {
    expect(() => new SlotValidator('Button', throwDiagnostics).assertExclusive()).toThrow(
      'Button: "as" and "asChild" are mutually exclusive',
    )
  })

  it('warns when strict is warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Button', warnDiagnostics).assertExclusive()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"as" and "asChild" are mutually exclusive'),
    )
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => new SlotValidator('Button', silentDiagnostics).assertExclusive()).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('warnDiscardedChildren', () => {
  it('uses singular form for count 1', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Card', warnDiagnostics).warnDiscardedChildren(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('1 non-element child —'))
  })

  it('uses plural form for count greater than 1', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Card', warnDiagnostics).warnDiscardedChildren(3)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('3 non-element children —'))
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Card', silentDiagnostics).warnDiscardedChildren(2)
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns but does not throw when strict is throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => new SlotValidator('Card', throwDiagnostics).warnDiscardedChildren(1)).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })
})

describe('assertSingleChild', () => {
  it('throws with count in message when strict is throw', () => {
    expect(() => new SlotValidator('Icon', throwDiagnostics).assertSingleChild(3)).toThrow(
      'Icon: asChild requires exactly one React element child, got 3',
    )
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => new SlotValidator('Icon', silentDiagnostics).assertSingleChild(0)).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})
