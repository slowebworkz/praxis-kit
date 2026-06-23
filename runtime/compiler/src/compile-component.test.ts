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

  it('returns a CompiledComponentArtifact when identity is complete', async () => {
    const result = await compileComponent(nodes(normalizePass))
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.definition.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
  })

  it('accumulates identity across multiple passes', async () => {
    const result = await compileComponent(nodes(namePass, tagPass, idPass))
    expect(result).not.toBeNull()
    expect(result!.definition.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
  })

  it('carries capabilities into the definition', async () => {
    const result = await compileComponent(nodes(normalizePass, capabilitiesPass))
    expect(result!.definition.capabilities).toEqual({ interactive: true })
  })

  it('carries metadata into the definition', async () => {
    const result = await compileComponent(nodes(normalizePass, metadataPass))
    expect(result!.definition.metadata).toEqual({ role: 'button' })
  })

  it('accumulates diagnostics across passes', async () => {
    const result = await compileComponent(nodes(normalizePass, diagnosticPass))
    expect(result!.definition.diagnostics).toHaveLength(1)
    expect(result!.definition.diagnostics[0]!.code).toBe('W001')
  })

  it('later pass wins on identity field conflict', async () => {
    const overridePass: Pass<ComponentContext> = {
      name: 'override',
      execute: () => ({ context: { identity: { name: 'Link' } } }),
    }
    const result = await compileComponent(nodes(normalizePass, overridePass))
    expect(result!.definition.identity.name).toBe('Link')
  })

  it('mirrors capabilities and diagnostics into artifact metadata', async () => {
    const result = await compileComponent(nodes(normalizePass, capabilitiesPass, diagnosticPass))
    expect(result!.metadata.capabilities).toEqual({ interactive: true })
    expect(result!.metadata.diagnostics).toHaveLength(1)
  })

  it('produces topology and styling hashes', async () => {
    const result = await compileComponent(nodes(normalizePass))
    expect(typeof result!.hashes.topology).toBe('string')
    expect(result!.hashes.topology).toHaveLength(16)
    expect(typeof result!.hashes.styling).toBe('string')
    expect(result!.hashes.styling).toHaveLength(16)
  })

  it('topology hash changes when identity changes', async () => {
    const r1 = await compileComponent(nodes(normalizePass))
    const differentNamePass: Pass<ComponentContext> = {
      name: 'normalize',
      execute: () => ({ context: { identity: { name: 'Link', tag: 'a', id: 'lnk-1' } } }),
    }
    const r2 = await compileComponent(nodes(differentNamePass))
    expect(r1!.hashes.topology).not.toBe(r2!.hashes.topology)
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
    expect(result!.version).toBe(1)
    expect(result!.definition.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
    expect(result!.definition.capabilities).toEqual({ interactive: true })
    expect(result!.definition.metadata).toEqual({ role: 'button' })
    expect(result!.definition.diagnostics).toHaveLength(1)
    expect(result!.hashes.topology).toHaveLength(16)
  })
})
