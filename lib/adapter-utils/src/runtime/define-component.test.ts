import { describe, expect, it } from 'vitest'
import { defineContractComponent } from './define-component'
import { warnDiagnostics } from '@praxis-kit/diagnostics'

describe('defineContractComponent', () => {
  it('passes options to the factory', () => {
    const createBox = defineContractComponent({ tag: 'div', name: 'Box' })
    expect(createBox((opts) => opts)).toEqual({ tag: 'div', name: 'Box' })
  })

  it('returns the factory return value', () => {
    const sentinel = Symbol('component')
    const createBox = defineContractComponent({ tag: 'div', name: 'Box' })
    expect(createBox(() => sentinel)).toBe(sentinel)
  })

  it('passes full options including styling and enforcement to the factory', () => {
    const options = {
      tag: 'button' as const,
      name: 'Button',
      styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      enforcement: { diagnostics: warnDiagnostics },
    }
    const createButton = defineContractComponent(options)
    expect(createButton((opts) => opts)).toBe(options)
  })
})
