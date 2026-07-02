import { describe, expect, it } from 'vitest'
import { applyAria } from './apply-aria'

describe('applyAria', () => {
  it('returns decoration unchanged when no ariaEngine is provided', () => {
    const decoration = { root: { attributes: { role: 'button' } } }
    expect(applyAria(decoration, 'div')).toBe(decoration)
  })

  it('does not mutate non-root entries when root is processed', () => {
    const child = { attributes: { id: 'x' } }
    const decoration = {
      root: { attributes: { role: 'button' } },
      child,
    }
    applyAria(decoration, 'div')
    expect(decoration.child).toBe(child)
  })

  it('preserves non-root decoration entries after engine processes root', () => {
    const child = { attributes: { id: 'x' } }
    const decoration = {
      root: { attributes: { role: 'button' } },
      child,
    }
    const result = applyAria(decoration, 'div')
    expect(result['child']).toBe(child)
  })
})
