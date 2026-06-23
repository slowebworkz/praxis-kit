import type { Pass } from '@pk2/pipeline'
import type { CompilerContext } from './types'
import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'
import {
  completeIdentityPass,
  namePass,
  tagPass,
  idPass,
  capabilitiesPass,
  diagnosticPass,
  nodes,
} from './compile-component.helpers'

describe('artifact', () => {
  it('version is 1', async () => {
    const result = await compileComponent(nodes(completeIdentityPass))
    expect(result!.version).toBe(1)
  })

  it('mirrors capabilities and diagnostics into artifact metadata', async () => {
    const result = await compileComponent(
      nodes(completeIdentityPass, capabilitiesPass, diagnosticPass),
    )
    expect(result!.metadata.capabilities).toEqual({ interactive: true })
    expect(result!.metadata.diagnostics).toHaveLength(1)
  })

  it('artifact is immutable — mutations to nested objects throw in strict mode', async () => {
    const result = (await compileComponent(nodes(completeIdentityPass)))!
    expect(() => {
      ;(result.definition.metadata as Record<string, unknown>)['role'] = 'mutated'
    }).toThrow(TypeError)
  })

  // ─── Hashes ────────────────────────────────────────────────────────────────

  describe('hashes', () => {
    it('produces 16-char hex hashes for topology and styling', async () => {
      const result = await compileComponent(nodes(completeIdentityPass))
      expect(result!.hashes.topology).toMatch(/^[0-9a-f]{16}$/)
      expect(result!.hashes.styling).toMatch(/^[0-9a-f]{16}$/)
    })

    it('identical compilations produce identical hashes', async () => {
      const r1 = await compileComponent(nodes(completeIdentityPass))
      const r2 = await compileComponent(nodes(completeIdentityPass))
      expect(r1!.hashes.topology).toBe(r2!.hashes.topology)
      expect(r1!.hashes.styling).toBe(r2!.hashes.styling)
    })

    it('topology hash changes when identity changes', async () => {
      const linkPass: Pass<CompilerContext> = {
        name: 'complete-identity',
        execute: () => ({ context: { identity: { name: 'Link', tag: 'a', id: 'lnk-1' } } }),
      }
      const r1 = await compileComponent(nodes(completeIdentityPass))
      const r2 = await compileComponent(nodes(linkPass))
      expect(r1!.hashes.topology).not.toBe(r2!.hashes.topology)
    })

    it('topology hash is stable regardless of identity pass order', async () => {
      const r1 = await compileComponent(nodes(namePass, tagPass, idPass))
      const r2 = await compileComponent(nodes(idPass, namePass, tagPass))
      expect(r1!.hashes.topology).toBe(r2!.hashes.topology)
    })

    it('topology hash is stable regardless of capabilities pass order', async () => {
      const interactivePass: Pass<CompilerContext> = {
        name: 'interactive',
        execute: () => ({ context: { capabilities: { interactive: true } } }),
      }
      const focusablePass: Pass<CompilerContext> = {
        name: 'focusable',
        execute: () => ({ context: { capabilities: { focusable: true } } }),
      }
      const r1 = await compileComponent(nodes(completeIdentityPass, interactivePass, focusablePass))
      const r2 = await compileComponent(nodes(completeIdentityPass, focusablePass, interactivePass))
      expect(r1!.hashes.topology).toBe(r2!.hashes.topology)
    })
  })
})
