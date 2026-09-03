import { describe, expect, it } from 'vitest'
import type { AriaContext, AriaRole } from '../../../types'
import type { RoleAttributeRequirements } from '../types'
import { checkRequiredAttributes, requiredAttributeByRole } from './required-properties-validator'

const diagnosticFor = (attribute: string, role: AriaRole) => ({
  code: 'ARIA2012' as never,
  category: 0 as never,
  message: `"${attribute}" is required for role="${role}"`,
})

function context(effectiveRole: string | undefined, props: Record<string, unknown>): AriaContext {
  return {
    tag: 'div',
    implicitRole: undefined,
    effectiveRole,
    props: props as AriaContext['props'],
    variantKeys: new Set(),
  }
}

describe('requiredAttributeByRole', () => {
  it('derives a { role: [attribute] } table from a role set', () => {
    expect(requiredAttributeByRole(['alert', 'status'], 'aria-atomic')).toEqual({
      alert: ['aria-atomic'],
      status: ['aria-atomic'],
    })
  })

  it('accepts any iterable of roles', () => {
    const roles = new Map<AriaRole, string>([
      ['log', 'polite'],
      ['timer', 'off'],
    ]).keys()
    expect(requiredAttributeByRole(roles, 'aria-atomic')).toEqual({
      log: ['aria-atomic'],
      timer: ['aria-atomic'],
    })
  })
})

describe('checkRequiredAttributes', () => {
  const requirement: RoleAttributeRequirements = {
    attributesByRole: { combobox: ['aria-expanded'], scrollbar: ['aria-controls', 'aria-valuenow'] },
    diagnosticFor,
  }

  it('is a no-op when the element has no effective role', () => {
    expect(checkRequiredAttributes(requirement, context(undefined, {}))).toEqual([{ valid: true }])
  })

  it('is a no-op for a role with no required attributes', () => {
    expect(checkRequiredAttributes(requirement, context('button', {}))).toEqual([{ valid: true }])
  })

  it('passes when every required attribute is present', () => {
    const results = checkRequiredAttributes(requirement, context('combobox', { 'aria-expanded': 'true' }))
    expect(results).toEqual([])
  })

  it('reports one warning per missing required attribute', () => {
    const results = checkRequiredAttributes(requirement, context('scrollbar', { 'aria-controls': 'x' }))
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      valid: false,
      fixable: false,
      severity: 'warning',
      attribute: 'aria-valuenow',
    })
  })

  it('treats a present-but-undefined attribute key as present (uses `in`)', () => {
    const results = checkRequiredAttributes(
      requirement,
      context('combobox', { 'aria-expanded': undefined }),
    )
    expect(results).toEqual([])
  })
})
