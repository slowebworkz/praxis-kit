import { describe, it, expect, vi, afterEach } from 'vitest'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'
import { SlotValidator } from '@praxis-kit/adapter-utils'

afterEach(() => vi.restoreAllMocks())

describe('assertExclusive', () => {
  it('throws with the component name when strict is throw', () => {
    expect(() => new SlotValidator('Button', throwDiagnostics, 'VNode').assertExclusive()).toThrow(
      'Button: "as" and "asChild" are mutually exclusive',
    )
  })

  it('warns when strict is warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Button', warnDiagnostics, 'VNode').assertExclusive()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"as" and "asChild" are mutually exclusive'),
    )
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      new SlotValidator('Button', silentDiagnostics, 'VNode').assertExclusive(),
    ).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('assertSingleChild', () => {
  it('throws with count in message when strict is throw', () => {
    expect(() => new SlotValidator('Icon', throwDiagnostics, 'VNode').assertSingleChild(3)).toThrow(
      'Icon: asChild requires exactly one VNode child, got 3',
    )
  })

  it('warns when strict is warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Icon', warnDiagnostics, 'VNode').assertSingleChild(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('asChild requires a VNode child'))
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      new SlotValidator('Icon', silentDiagnostics, 'VNode').assertSingleChild(0),
    ).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it('includes the component name in the throw message', () => {
    expect(() =>
      new SlotValidator('MyCard', throwDiagnostics, 'VNode').assertSingleChild(2),
    ).toThrow('MyCard')
  })
})

describe('warnDiscardedChildren', () => {
  it('warns (not throws) even when strict is throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      new SlotValidator('Box', throwDiagnostics, 'VNode').warnDiscardedChildren(1),
    ).not.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('discarded 1 non-element child'))
  })

  it('uses singular form for count of 1', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Box', warnDiagnostics, 'VNode').warnDiscardedChildren(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('non-element child —'))
  })

  it('uses plural form for count greater than 1', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Box', warnDiagnostics, 'VNode').warnDiscardedChildren(3)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('discarded 3 non-element children'))
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Box', silentDiagnostics, 'VNode').warnDiscardedChildren(2)
    expect(warn).not.toHaveBeenCalled()
  })

  it('includes the component name in the warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Dialog', warnDiagnostics, 'VNode').warnDiscardedChildren(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Dialog'))
  })
})
