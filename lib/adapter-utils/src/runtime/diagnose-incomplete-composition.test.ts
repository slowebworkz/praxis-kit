import { describe, expect, it, vi } from 'vitest'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import { diagnoseIncompleteComposition } from './diagnose-incomplete-composition'

describe('diagnoseIncompleteComposition', () => {
  it('does not warn for an empty compose object', () => {
    const warn = vi.fn()

    diagnoseIncompleteComposition({}, 'Card', { warn })

    expect(warn).not.toHaveBeenCalled()
  })

  it('warns when allProps is explicitly false without a composition target', () => {
    const warn = vi.fn()

    diagnoseIncompleteComposition({ allProps: false }, 'Card', { warn })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith({
      code: DiagnosticCode.CompositionOptionsWithoutWith,
      category: DiagnosticCategory.Composition,
      message: 'compose.allProps has no effect without compose.with.',
      component: 'Card',
    })
  })

  it('warns when an empty defaults object is explicitly supplied without a target', () => {
    const warn = vi.fn()

    diagnoseIncompleteComposition({ defaults: {} }, undefined, { warn })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith({
      code: DiagnosticCode.CompositionOptionsWithoutWith,
      category: DiagnosticCategory.Composition,
      message: 'compose.defaults has no effect without compose.with.',
    })
  })

  it('reports both supplied options in one construction-time diagnostic', () => {
    const warn = vi.fn()

    diagnoseIncompleteComposition({ allProps: false, defaults: {} }, 'Card', { warn })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith({
      code: DiagnosticCode.CompositionOptionsWithoutWith,
      category: DiagnosticCategory.Composition,
      message: 'compose.allProps and compose.defaults have no effect without compose.with.',
      component: 'Card',
    })
  })

  it('treats an explicitly undefined target as missing', () => {
    const warn = vi.fn()

    diagnoseIncompleteComposition({ with: undefined, allProps: true, defaults: {} }, 'Card', {
      warn,
    })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith({
      code: DiagnosticCode.CompositionOptionsWithoutWith,
      category: DiagnosticCategory.Composition,
      message: 'compose.allProps and compose.defaults have no effect without compose.with.',
      component: 'Card',
    })
  })

  it('does not warn when a composition target is present', () => {
    const warn = vi.fn()

    diagnoseIncompleteComposition({ with: () => null, allProps: false, defaults: {} }, 'Card', {
      warn,
    })

    expect(warn).not.toHaveBeenCalled()
  })
})
