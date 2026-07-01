import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'
import { contributeSlots, contributeVariants } from './passes'
import {
  namePass,
  tagPass,
  idPass,
  capabilitiesPass,
  metadataPass,
  diagnosticPass,
  nodes,
} from './compile-component.helpers'

describe('compileComponent — integration', () => {
  it('full compiler flow', async () => {
    const result = await compileComponent(
      nodes(
        namePass,
        tagPass,
        idPass,
        capabilitiesPass,
        metadataPass,
        diagnosticPass,
        contributeSlots(['content'], 'button-content-slot'),
        contributeVariants({ size: ['sm', 'lg'] }, 'button-size-variants'),
      ),
    )
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.definition.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
    expect(result!.definition.capabilities).toEqual({ interactive: true })
    expect(result!.definition.metadata).toEqual({ role: 'button' })
    expect(result!.definition.diagnostics).toHaveLength(1)
    expect(result!.metadata.slots).toEqual(['content'])
    expect(result!.metadata.variants).toEqual({ size: ['sm', 'lg'] })
    expect(result!.hashes.topology).toMatch(/^[0-9a-f]{16}$/)
  })
})
