import { describe, expect, it } from 'vitest'
import type { ComponentContext, ComponentDefinition, ComponentIdentity } from './types'

function resolveDefinition(context: ComponentContext): ComponentDefinition | null {
  const { id, name, tag } = context.identity
  if (!id || !name || !tag) return null
  return {
    identity: { id, name, tag } satisfies ComponentIdentity,
    capabilities: context.capabilities,
    metadata: context.metadata,
    diagnostics: context.diagnostics,
  }
}

describe('definition resolution', () => {
  it('resolves from a fully accumulated context', () => {
    const context: ComponentContext = {
      identity: { id: 'btn-1', name: 'Button', tag: 'button' },
      capabilities: { interactive: true },
      metadata: { role: 'button' },
      diagnostics: [],
    }
    const definition = resolveDefinition(context)
    expect(definition).not.toBeNull()
    expect(definition!.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
  })

  it('accumulates identity incrementally across passes', () => {
    let context: ComponentContext = {
      identity: {},
      capabilities: {},
      metadata: {},
      diagnostics: [],
    }

    context = { ...context, identity: { ...context.identity, name: 'Button' } }
    context = { ...context, identity: { ...context.identity, tag: 'button' } }
    context = { ...context, identity: { ...context.identity, id: 'btn-1' } }

    const definition = resolveDefinition(context)

    expect(definition).not.toBeNull()
    expect(definition!.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
  })

  it('allows domains to accumulate independently', () => {
    let context: ComponentContext = {
      identity: {},
      capabilities: {},
      metadata: {},
      diagnostics: [],
    }

    context = { ...context, capabilities: { ...context.capabilities, interactive: true } }
    context = { ...context, metadata: { ...context.metadata, role: 'button' } }

    expect(resolveDefinition(context)).toBeNull()
    expect(context.capabilities).toEqual({ interactive: true })
    expect(context.metadata).toEqual({ role: 'button' })
  })

  it('returns null when identity is incomplete', () => {
    const context: ComponentContext = {
      identity: { name: 'Button' },
      capabilities: {},
      metadata: {},
      diagnostics: [],
    }
    expect(resolveDefinition(context)).toBeNull()
  })

  it('preserves diagnostics even when identity is incomplete', () => {
    const context: ComponentContext = {
      identity: { name: 'Button' },
      capabilities: {},
      metadata: {},
      diagnostics: [{ code: 'W001', message: 'missing role', severity: 'warning' }],
    }

    expect(resolveDefinition(context)).toBeNull()
    expect(context.diagnostics).toHaveLength(1)
  })

  it('carries capabilities into the definition', () => {
    const context: ComponentContext = {
      identity: { id: 'btn-1', name: 'Button', tag: 'button' },
      capabilities: { interactive: true, focusable: true },
      metadata: {},
      diagnostics: [],
    }
    expect(resolveDefinition(context)!.capabilities).toEqual({
      interactive: true,
      focusable: true,
    })
  })

  it('carries metadata into the definition', () => {
    const context: ComponentContext = {
      identity: { id: 'btn-1', name: 'Button', tag: 'button' },
      capabilities: {},
      metadata: { role: 'button' },
      diagnostics: [],
    }

    expect(resolveDefinition(context)!.metadata).toEqual({ role: 'button' })
  })

  it('carries diagnostics into the definition', () => {
    const context: ComponentContext = {
      identity: { id: 'btn-1', name: 'Button', tag: 'button' },
      capabilities: {},
      metadata: {},
      diagnostics: [{ code: 'W001', message: 'missing role', severity: 'warning' }],
    }
    expect(resolveDefinition(context)!.diagnostics).toHaveLength(1)
  })
})
