import { describe, expect, it } from 'vitest'
import type { Pass } from '@pk2/pipeline'
import type { ComponentContext } from './types'

// Merge semantics are shallow except for identity, which is merged field-by-field.
// Conflicting fields are resolved with last-writer-wins.
function mergeContext(
  current: ComponentContext,
  partial: Partial<ComponentContext>,
): ComponentContext {
  return {
    ...current,
    ...partial,
    identity: { ...current.identity, ...partial.identity },
  }
}

async function accumulate(
  context: ComponentContext,
  passes: Pass<ComponentContext>[],
): Promise<ComponentContext> {
  let current = context
  for (const pass of passes) {
    const result = await pass.execute(current)
    if (result.context) {
      current = mergeContext(current, result.context)
    }
  }
  return current
}

const empty = (): ComponentContext => ({
  identity: {},
  capabilities: {},
  metadata: {},
  diagnostics: [],
})

const normalizePass: Pass<ComponentContext> = {
  name: 'normalize',
  execute: () => ({ context: { identity: { name: 'Button' } } }),
}

const htmlPass: Pass<ComponentContext> = {
  name: 'html',
  execute: () => ({ context: { identity: { tag: 'button' } } }),
}

const idPass: Pass<ComponentContext> = {
  name: 'id',
  execute: () => ({ context: { identity: { id: 'btn-1' } } }),
}

describe('ComponentContext accumulation', () => {
  it('normalizePass contributes identity.name', async () => {
    const result = await accumulate(empty(), [normalizePass])
    expect(result.identity.name).toBe('Button')
    expect(result.identity.tag).toBeUndefined()
    expect(result.identity.id).toBeUndefined()
  })

  it('htmlPass contributes identity.tag', async () => {
    const result = await accumulate(empty(), [htmlPass])
    expect(result.identity.tag).toBe('button')
    expect(result.identity.name).toBeUndefined()
    expect(result.identity.id).toBeUndefined()
  })

  it('idPass contributes identity.id', async () => {
    const result = await accumulate(empty(), [idPass])
    expect(result.identity.id).toBe('btn-1')
    expect(result.identity.name).toBeUndefined()
    expect(result.identity.tag).toBeUndefined()
  })

  it('three passes independently accumulate a complete identity', async () => {
    const result = await accumulate(empty(), [normalizePass, htmlPass, idPass])
    expect(result.identity).toEqual({ id: 'btn-1', name: 'Button', tag: 'button' })
  })

  it('accumulation order does not matter for independent fields', async () => {
    const a = await accumulate(empty(), [idPass, htmlPass, normalizePass])
    const b = await accumulate(empty(), [normalizePass, htmlPass, idPass])
    expect(a.identity).toEqual(b.identity)
  })

  it('later pass overrides earlier pass on same field', async () => {
    const override: Pass<ComponentContext> = {
      name: 'override',
      execute: () => ({ context: { identity: { name: 'Link' } } }),
    }
    const result = await accumulate(empty(), [normalizePass, override])
    expect(result.identity.name).toBe('Link')
  })
})
