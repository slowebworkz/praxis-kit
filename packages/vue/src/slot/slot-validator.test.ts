import { describe, it, expect, vi, afterEach } from 'vitest'
import { SlotValidator } from './slot-validator'

afterEach(() => vi.restoreAllMocks())

describe('assertExclusive', () => {
  it('throws with the component name when strict is throw', () => {
    expect(() => new SlotValidator('Button', 'throw').assertExclusive()).toThrow(
      'Button: "as" and "asChild" are mutually exclusive',
    )
  })

  it('warns when strict is warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Button', 'warn').assertExclusive()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"as" and "asChild" are mutually exclusive'),
    )
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => new SlotValidator('Button', false).assertExclusive()).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('assertSingleChild', () => {
  it('throws with count in message when strict is throw', () => {
    expect(() => new SlotValidator('Icon', 'throw').assertSingleChild(3)).toThrow(
      'Icon: asChild requires exactly one VNode child, got 3',
    )
  })

  it('warns when strict is warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new SlotValidator('Icon', 'warn').assertSingleChild(0)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('asChild requires exactly one VNode child, got 0'),
    )
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => new SlotValidator('Icon', false).assertSingleChild(0)).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it('includes the component name in the throw message', () => {
    expect(() => new SlotValidator('MyCard', 'throw').assertSingleChild(2)).toThrow('MyCard')
  })
})
