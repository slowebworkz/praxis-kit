import { describe, expect, it } from 'vitest'
import { createPolymorphic } from '@praxis-kit/core'
import {
  attachCompositionStyleMetadata,
  composeStyleProps,
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
    const component = () => {}

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
    expect(getCompositionStyleMetadata(() => {})).toBeUndefined()
    expect(getCompositionStyleMetadata(null)).toBeUndefined()
  })
})

describe('composeStyleProps', () => {
  const primary = {
    variants: {
      intent: { primary: 'primary-intent', quiet: 'quiet-intent' },
      size: { sm: 'small-size', lg: 'large-size' },
    },
  }

  it('preserves an explicitly forwarded prop even when it equals compose.defaults', () => {
    const defaults = { tone: 'quiet' }
    const result = composeStyleProps(
      { tone: 'quiet', size: 'lg' },
      { tone: 'quiet' },
      primary,
      defaults,
    )

    expect(result).toEqual({ tone: 'quiet', size: 'lg' })
  })

  it('uses an explicit primary variant value instead of compose.defaults', () => {
    const defaults = { intent: 'quiet' }
    const result = composeStyleProps(
      { intent: 'quiet', size: 'lg' },
      { intent: 'primary' },
      primary,
      defaults,
    )

    expect(result).toEqual({ intent: 'primary', size: 'lg' })
  })
})
