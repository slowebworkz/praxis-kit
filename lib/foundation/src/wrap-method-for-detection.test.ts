import { describe, expect, it, vi } from 'vitest'

import { wrapMethodForDetection } from './wrap-method-for-detection'

class Dialog {
  open = false
  showModal(): void {
    this.open = true
  }
}

describe('wrapMethodForDetection', () => {
  it('still runs the original method when the wrapped method is called', () => {
    const dialog = new Dialog()
    wrapMethodForDetection(dialog, 'showModal', () => {})
    dialog.showModal()
    expect(dialog.open).toBe(true)
  })

  it('invokes onExternalCall with the call arguments when the wrapped method is called', () => {
    class Target {
      set(value: number): void {
        void value
      }
    }
    const target = new Target()
    const onExternalCall = vi.fn()
    wrapMethodForDetection(target, 'set', onExternalCall)
    target.set(42)
    expect(onExternalCall).toHaveBeenCalledWith(42)
  })

  it('returns the wrapped method result', () => {
    class Target {
      double(n: number): number {
        return n * 2
      }
    }
    const target = new Target()
    wrapMethodForDetection(target, 'double', () => {})
    expect(target.double(21)).toBe(42)
  })

  it('callSilently runs the original method without invoking onExternalCall', () => {
    const dialog = new Dialog()
    const onExternalCall = vi.fn()
    const { callSilently } = wrapMethodForDetection(dialog, 'showModal', onExternalCall)
    callSilently()
    expect(dialog.open).toBe(true)
    expect(onExternalCall).not.toHaveBeenCalled()
  })

  it('restore() removes the wrapper so onExternalCall no longer fires', () => {
    const dialog = new Dialog()
    const onExternalCall = vi.fn()
    const { restore } = wrapMethodForDetection(dialog, 'showModal', onExternalCall)
    restore()
    dialog.showModal()
    expect(dialog.open).toBe(true)
    expect(onExternalCall).not.toHaveBeenCalled()
  })

  it('restore() falls back to the prototype method when there was no own override', () => {
    const dialog = new Dialog()
    const { restore } = wrapMethodForDetection(dialog, 'showModal', () => {})
    restore()
    expect(Object.hasOwn(dialog, 'showModal')).toBe(false)
    expect(dialog.showModal).toBe(Dialog.prototype.showModal)
  })

  it('propagates an error thrown by the original method (and does not call onExternalCall)', () => {
    class Target {
      boom(): void {
        throw new Error('original failed')
      }
    }
    const target = new Target()
    const onExternalCall = vi.fn()
    wrapMethodForDetection(target, 'boom', onExternalCall)
    expect(() => target.boom()).toThrow('original failed')
    expect(onExternalCall).not.toHaveBeenCalled()
  })

  it('propagates an error thrown by onExternalCall after the original method has run', () => {
    const dialog = new Dialog()
    wrapMethodForDetection(dialog, 'showModal', () => {
      throw new Error('callback failed')
    })
    expect(() => dialog.showModal()).toThrow('callback failed')
    expect(dialog.open).toBe(true) // original ran first
  })

  it('restore() puts back a pre-existing own-property override, not the prototype', () => {
    const dialog = new Dialog()
    const custom = vi.fn(function (this: Dialog) {
      this.open = true
    })
    dialog.showModal = custom as unknown as Dialog['showModal']

    const { restore } = wrapMethodForDetection(dialog, 'showModal', () => {})
    restore()

    expect(Object.hasOwn(dialog, 'showModal')).toBe(true)
    expect(dialog.showModal).toBe(custom)
    dialog.showModal()
    expect(custom).toHaveBeenCalledOnce()
  })
})
