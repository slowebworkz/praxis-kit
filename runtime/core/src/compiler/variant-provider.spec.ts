import { describe, expect, it } from 'vitest'
import { variantProvider } from './variant-provider'
import { compileComponent } from './compile-component'
import { completeIdentityPass, nodes } from './compile-component.helpers'

describe('variantProvider', () => {
  describe('absent — variants undefined', () => {
    it('returns an empty array when variants is undefined', () => {
      expect(variantProvider.create({})).toEqual([])
    })

    it('contributes nothing to the artifact when not called', async () => {
      const result = await compileComponent(nodes(completeIdentityPass))
      expect(result!.metadata.variants).toBeUndefined()
    })
  })

  describe('present — variants provided', () => {
    it('returns a single pass when variants are provided', () => {
      const passes = variantProvider.create({ variants: { size: ['sm', 'lg'] } })
      expect(passes).toHaveLength(1)
    })

    it('the returned pass has the default name', () => {
      const [pass] = variantProvider.create({ variants: { size: ['sm', 'lg'] } })
      expect(pass!.name).toBe('variants')
    })

    it('accepts a custom name via options', () => {
      const [pass] = variantProvider.create({
        variants: { size: ['sm', 'lg'] },
        name: 'button-variants',
      })
      expect(pass!.name).toBe('button-variants')
    })

    it('contributes variants to the compiled artifact', async () => {
      const passes = variantProvider.create({ variants: { size: ['sm', 'md', 'lg'] } })
      const result = await compileComponent(nodes(completeIdentityPass, ...passes))
      expect(result!.metadata.variants).toEqual({ size: ['sm', 'md', 'lg'] })
    })

    it('two providers with different names accumulate independently', async () => {
      const sizePass = variantProvider.create({
        variants: { size: ['sm', 'lg'] },
        name: 'variants-size',
      })
      const intentPass = variantProvider.create({
        variants: { intent: ['primary', 'ghost'] },
        name: 'variants-intent',
      })
      const result = await compileComponent(nodes(completeIdentityPass, ...sizePass, ...intentPass))
      expect(result!.metadata.variants).toEqual({
        size: ['sm', 'lg'],
        intent: ['primary', 'ghost'],
      })
    })
  })
})
