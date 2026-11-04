import { describe, expectTypeOf, it } from 'vitest'
import type {
  AriaIdElement,
  AriaIdReferenceResolution,
  AriaReferenceIndex,
} from './aria-reference-index'
import { createAriaReferenceIndex } from './aria-reference-index'

describe('public ARIA reference index types', () => {
  it('resolves to the generic resolution union over the supplied element type', () => {
    interface Item extends AriaIdElement {
      readonly label: string
    }
    const index = createAriaReferenceIndex<Item>([{ id: 'a', label: 'A' }])

    expectTypeOf(index).toEqualTypeOf<AriaReferenceIndex<Item>>()
    expectTypeOf(index.resolve('a')).toEqualTypeOf<AriaIdReferenceResolution<Item>>()
    expectTypeOf(index.resolveList('a')).toEqualTypeOf<readonly AriaIdReferenceResolution<Item>[]>()
  })
})
