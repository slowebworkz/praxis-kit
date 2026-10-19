import { describe, expect, it } from 'vitest'
import { createPolymorphic } from '@praxis-kit/core'
import {
  attachCompositionStyleMetadata,
  getCompositionStyleMetadata,
} from './composition-style-metadata'

describe('composition style metadata', () => {
  it('retains standard resolved styling fields without exposing metadata as an enumerable property', () => {
    const runtime = createPolymorphic({
      tag: 'button',
      styling: {
        base: 'button-base',
        variants: { intent: { primary: 'button-primary', quiet: 'button-quiet' } },
        defaults: { intent: 'primary' },
        tags: { a: 'button-link' },
        presets: { compact: { intent: 'quiet' } },
      },
    })
    const component = () => undefined

    attachCompositionStyleMetadata(component, runtime.options)

    expect(getCompositionStyleMetadata(component)).toEqual({
      baseClassName: 'button-base',
      variants: { intent: { primary: 'button-primary', quiet: 'button-quiet' } },
      defaultVariants: { intent: 'primary' },
      recipeMap: { compact: { intent: 'quiet' } },
      tagMap: { a: 'button-link' },
    })
    expect(
      Object.getOwnPropertyDescriptor(
        component,
        Symbol.for('@praxis-kit/composition-style-metadata'),
      )?.enumerable,
    ).toBe(false)
    expect(getCompositionStyleMetadata(() => undefined)).toBeUndefined()
    expect(getCompositionStyleMetadata(null)).toBeUndefined()
  })
})
