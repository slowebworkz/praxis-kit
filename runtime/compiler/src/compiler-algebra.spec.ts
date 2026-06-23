import type { Pass } from '@pk2/pipeline'
import type { VariantMap } from '@pk2/foundation'
import type { CompilerContext } from './types'
import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'
import { contributeSlots, contributeVariants } from './passes'
import {
  completeIdentityPass,
  namePass,
  tagPass,
  idPass,
  capabilitiesPass,
  metadataPass,
  diagnosticPass,
  nodes,
} from './compile-component.helpers'

// CompilerContext + CompilerContext = CompilerContext: each domain has a
// defined merge policy. These tests verify the algebraic properties of each.

describe('compiler algebra', () => {
  // ─── Identity ──────────────────────────────────────────────────────────────

  describe('identity', () => {
    it('resolves a complete identity', async () => {
      const result = await compileComponent(nodes(completeIdentityPass))
      expect(result!.definition.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
    })

    it('accumulates identity across multiple passes', async () => {
      const result = await compileComponent(nodes(namePass, tagPass, idPass))
      expect(result!.definition.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
    })

    it('later pass wins on identity field conflict', async () => {
      const overridePass: Pass<CompilerContext> = {
        name: 'override',
        execute: () => ({ context: { identity: { name: 'Link' } } }),
      }
      const result = await compileComponent(nodes(completeIdentityPass, overridePass))
      expect(result!.definition.identity.name).toBe('Link')
    })
  })

  // ─── Capabilities ──────────────────────────────────────────────────────────

  describe('capabilities', () => {
    it('carries capabilities into the definition', async () => {
      const result = await compileComponent(nodes(completeIdentityPass, capabilitiesPass))
      expect(result!.definition.capabilities).toEqual({ interactive: true })
    })

    it('capabilities are monotonic — a pass cannot disable what an earlier pass enabled', async () => {
      const enablePass: Pass<CompilerContext> = {
        name: 'enable',
        execute: () => ({ context: { capabilities: { interactive: true } } }),
      }
      const disablePass: Pass<CompilerContext> = {
        name: 'disable',
        execute: () => ({ context: { capabilities: { interactive: false } } }),
      }
      const result = await compileComponent(nodes(completeIdentityPass, enablePass, disablePass))
      expect(result!.definition.capabilities['interactive']).toBe(true)
    })

    it('capabilities are monotonic — order independent (disable then enable yields true)', async () => {
      const disablePass: Pass<CompilerContext> = {
        name: 'disable',
        execute: () => ({ context: { capabilities: { interactive: false } } }),
      }
      const enablePass: Pass<CompilerContext> = {
        name: 'enable',
        execute: () => ({ context: { capabilities: { interactive: true } } }),
      }
      const result = await compileComponent(nodes(completeIdentityPass, disablePass, enablePass))
      expect(result!.definition.capabilities['interactive']).toBe(true)
    })
  })

  // ─── Metadata ──────────────────────────────────────────────────────────────

  describe('metadata', () => {
    it('carries metadata into the definition', async () => {
      const result = await compileComponent(nodes(completeIdentityPass, metadataPass))
      expect(result!.definition.metadata).toEqual({ role: 'button' })
    })

    it('deep-merges nested metadata from multiple passes without clobbering sibling keys', async () => {
      const summaryPass: Pass<CompilerContext> = {
        name: 'docs-summary',
        execute: () => ({ context: { metadata: { docs: { summary: 'Button' } } } }),
      }
      const examplesPass: Pass<CompilerContext> = {
        name: 'docs-examples',
        execute: () => ({ context: { metadata: { docs: { examples: ['foo'] } } } }),
      }
      const result = await compileComponent(nodes(completeIdentityPass, summaryPass, examplesPass))
      expect(result!.definition.metadata).toEqual({
        docs: { summary: 'Button', examples: ['foo'] },
      })
    })

    it('array values in metadata are replaced by later passes, not merged', async () => {
      const firstPass: Pass<CompilerContext> = {
        name: 'docs-a',
        execute: () => ({ context: { metadata: { docs: { examples: ['a'] } } } }),
      }
      const secondPass: Pass<CompilerContext> = {
        name: 'docs-b',
        execute: () => ({ context: { metadata: { docs: { examples: ['b'] } } } }),
      }
      const result = await compileComponent(nodes(completeIdentityPass, firstPass, secondPass))
      expect(result!.definition.metadata).toEqual({ docs: { examples: ['b'] } })
    })
  })

  // ─── Diagnostics ───────────────────────────────────────────────────────────

  describe('diagnostics', () => {
    it('accumulates diagnostics across passes', async () => {
      const result = await compileComponent(nodes(completeIdentityPass, diagnosticPass))
      expect(result!.definition.diagnostics).toHaveLength(1)
      expect(result!.definition.diagnostics[0]!.code).toBe('W001')
    })
  })

  // ─── Slots ─────────────────────────────────────────────────────────────────

  describe('slots', () => {
    it('populates slots in artifact metadata', async () => {
      const result = await compileComponent(
        nodes(completeIdentityPass, contributeSlots(['header', 'footer'], 'layout-slots')),
      )
      expect(result!.metadata.slots).toEqual(['header', 'footer'])
    })

    it('accumulates slots across multiple passes', async () => {
      const result = await compileComponent(
        nodes(
          completeIdentityPass,
          contributeSlots(['header'], 'slots-layout'),
          contributeSlots(['footer'], 'slots-footer'),
        ),
      )
      expect(result!.metadata.slots).toEqual(['header', 'footer'])
    })

    it('leaves slots undefined when no slots pass runs', async () => {
      const result = await compileComponent(nodes(completeIdentityPass))
      expect(result!.metadata.slots).toBeUndefined()
    })

    it('preserves duplicate slot declarations without deduplication', async () => {
      const result = await compileComponent(
        nodes(
          completeIdentityPass,
          contributeSlots(['root'], 'slots-a'),
          contributeSlots(['root'], 'slots-b'),
        ),
      )
      expect(result!.metadata.slots).toEqual(['root', 'root'])
    })

    it('empty contributeSlots produces an empty array not undefined', async () => {
      const result = await compileComponent(
        nodes(completeIdentityPass, contributeSlots([], 'empty-slots')),
      )
      expect(result!.metadata.slots).toEqual([])
    })

    it('captures a snapshot — slot mutation after pass creation does not affect output', async () => {
      const slots = ['content']
      const pass = contributeSlots(slots, 'snapshot-test')
      slots.push('icon')
      const result = await compileComponent(nodes(completeIdentityPass, pass))
      expect(result!.metadata.slots).toEqual(['content'])
    })
  })

  // ─── Variants ──────────────────────────────────────────────────────────────

  describe('variants', () => {
    it('populates variants in artifact metadata', async () => {
      const result = await compileComponent(
        nodes(
          completeIdentityPass,
          contributeVariants({ size: ['sm', 'md', 'lg'] }, 'size-variants'),
        ),
      )
      expect(result!.metadata.variants).toEqual({ size: ['sm', 'md', 'lg'] })
    })

    it('unions variant values across passes', async () => {
      const result = await compileComponent(
        nodes(
          completeIdentityPass,
          contributeVariants({ size: ['sm', 'md'] }, 'variants-base'),
          contributeVariants({ intent: ['primary', 'secondary'], size: ['xl'] }, 'variants-extra'),
        ),
      )
      expect(result!.metadata.variants).toEqual({
        size: ['sm', 'md', 'xl'],
        intent: ['primary', 'secondary'],
      })
    })

    it('deduplicates values when the same value appears in multiple passes', async () => {
      const result = await compileComponent(
        nodes(
          completeIdentityPass,
          contributeVariants({ size: ['sm', 'md'] }, 'variants-a'),
          contributeVariants({ size: ['md', 'xl'] }, 'variants-b'),
        ),
      )
      expect(result!.metadata.variants).toEqual({ size: ['sm', 'md', 'xl'] })
    })

    it('leaves variants undefined when no variants pass runs', async () => {
      const result = await compileComponent(nodes(completeIdentityPass))
      expect(result!.metadata.variants).toBeUndefined()
    })

    it('empty contributeVariants produces an empty object not undefined', async () => {
      const result = await compileComponent(
        nodes(completeIdentityPass, contributeVariants({}, 'empty-variants')),
      )
      expect(result!.metadata.variants).toEqual({})
    })

    it('captures a snapshot — variant mutation after pass creation does not affect output', async () => {
      const variants: VariantMap = { size: ['sm', 'lg'] }
      const pass = contributeVariants(variants, 'snapshot-test')
      variants['intent'] = ['primary']
      const result = await compileComponent(nodes(completeIdentityPass, pass))
      expect(result!.metadata.variants).toEqual({ size: ['sm', 'lg'] })
    })
  })
})
