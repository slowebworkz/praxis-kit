import type { Pass, Plugin } from '@pk2/pipeline'
import type { ComponentContext } from '@pk2/core'
import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'

const normalizePass: Pass<ComponentContext> = {
  name: 'normalize',
  execute: () => ({ context: { identity: { name: 'Button', tag: 'button', id: 'btn-1' } } }),
}

const namePass: Pass<ComponentContext> = {
  name: 'name',
  execute: () => ({ context: { identity: { name: 'Button' } } }),
}

const tagPass: Pass<ComponentContext> = {
  name: 'tag',
  execute: () => ({ context: { identity: { tag: 'button' } } }),
}

const idPass: Pass<ComponentContext> = {
  name: 'id',
  execute: () => ({ context: { identity: { id: 'btn-1' } } }),
}

const capabilitiesPass: Pass<ComponentContext> = {
  name: 'capabilities',
  execute: () => ({ context: { capabilities: { interactive: true } } }),
}

const metadataPass: Pass<ComponentContext> = {
  name: 'metadata',
  execute: () => ({ context: { metadata: { role: 'button' } } }),
}

const diagnosticPass: Pass<ComponentContext> = {
  name: 'diagnostic',
  execute: () => ({
    context: { diagnostics: [{ code: 'W001', message: 'missing label', severity: 'warning' }] },
  }),
}

function nodes(...passes: Pass<ComponentContext>[]): ReadonlyMap<string, Pass<ComponentContext>> {
  return new Map(passes.map((p) => [p.name, p]))
}

describe('compileComponent', () => {
  it('returns null when identity is incomplete', async () => {
    const result = await compileComponent(nodes(namePass, tagPass))
    expect(result).toBeNull()
  })

  it('returns null when no passes run', async () => {
    const result = await compileComponent(new Map())
    expect(result).toBeNull()
  })

  it('returns a ComponentDefinition when identity is complete', async () => {
    const result = await compileComponent(nodes(normalizePass))
    expect(result).not.toBeNull()
    expect(result!.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
  })

  it('accumulates identity across multiple passes', async () => {
    const result = await compileComponent(nodes(namePass, tagPass, idPass))
    expect(result).not.toBeNull()
    expect(result!.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
  })

  it('carries capabilities into the definition', async () => {
    const result = await compileComponent(nodes(normalizePass, capabilitiesPass))
    expect(result!.capabilities).toEqual({ interactive: true })
  })

  it('carries metadata into the definition', async () => {
    const result = await compileComponent(nodes(normalizePass, metadataPass))
    expect(result!.metadata).toEqual({ role: 'button' })
  })

  it('accumulates diagnostics across passes', async () => {
    const result = await compileComponent(nodes(normalizePass, diagnosticPass))
    expect(result!.diagnostics).toHaveLength(1)
    expect(result!.diagnostics[0]!.code).toBe('W001')
  })

  it('later pass wins on identity field conflict', async () => {
    const overridePass: Pass<ComponentContext> = {
      name: 'override',
      execute: () => ({ context: { identity: { name: 'Link' } } }),
    }
    const result = await compileComponent(nodes(normalizePass, overridePass))
    expect(result!.identity.name).toBe('Link')
  })

  it('accepts plugin injection', async () => {
    const seen: string[] = []
    const pluginPass: Pass<ComponentContext> = {
      name: 'plugin-pass',
      execute: () => {
        seen.push('plugin')
        return {}
      },
    }
    const plugin: Plugin<ComponentContext> = {
      name: 'test-plugin',
      nodes: new Map([['plugin-pass', pluginPass]]),
    }
    await compileComponent(nodes(normalizePass), [plugin])
    expect(seen).toContain('plugin')
  })

  it('end-to-end: full compiler flow', async () => {
    const result = await compileComponent(
      nodes(namePass, tagPass, idPass, capabilitiesPass, metadataPass, diagnosticPass),
    )
    expect(result).not.toBeNull()
    expect(result!.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
    expect(result!.capabilities).toEqual({ interactive: true })
    expect(result!.metadata).toEqual({ role: 'button' })
    expect(result!.diagnostics).toHaveLength(1)
  })
})
