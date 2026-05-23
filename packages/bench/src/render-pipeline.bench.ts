import { bench, describe } from 'vitest'
import { createPolymorphic } from '@polymorphic-ui/core'
import { cva } from 'class-variance-authority'

// Runtimes are created once at module load so factory cost is excluded.
const noVariantRuntime = createPolymorphic({
  tag: 'div',
  styling: { base: 'box' },
})

const variantRuntime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: {
      size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    },
    defaults: { size: 'md', intent: 'primary' },
    compounds: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
  },
})

const cvaFn = cva('btn', {
  variants: {
    size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
    intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
  },
  defaultVariants: { size: 'md', intent: 'primary' },
  compoundVariants: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
})

// VariantClassResolver uses an LRU cache keyed on (variantKey, sorted prop entries).
// Same-props calls hit the cache after the first render.
const WARM_PROPS = { size: 'lg', intent: 'ghost' } as Record<string, unknown>

// Rotating through > cache capacity (1000) forces steady-state cache misses.
const COLD_POOL = Array.from({ length: 1200 }, (_, i) => ({
  size: (['sm', 'md', 'lg'] as const)[i % 3],
  intent: (['primary', 'ghost'] as const)[i % 2],
  _bust: i,
})) as unknown as Array<Record<string, unknown>>
let coldIdx = 0

describe('resolveClasses — no variants (warm cache)', () => {
  bench('resolveClasses', () => {
    noVariantRuntime.resolveClasses('div', {}, undefined, undefined)
  })
})

describe('resolveClasses — with variants, warm cache', () => {
  bench('resolveClasses', () => {
    variantRuntime.resolveClasses('button', WARM_PROPS, undefined, undefined)
  })

  bench('cva direct (baseline)', () => {
    cvaFn(WARM_PROPS)
  })
})

describe('resolveClasses — with variants, cold cache (> 1000-entry LRU capacity)', () => {
  bench('resolveClasses', () => {
    variantRuntime.resolveClasses(
      'button',
      COLD_POOL[coldIdx++ % COLD_POOL.length]!,
      undefined,
      undefined,
    )
  })

  bench('cva direct (baseline)', () => {
    cvaFn(COLD_POOL[coldIdx++ % COLD_POOL.length]!)
  })
})

describe('full render pipeline (resolveTag + resolveProps + resolveClasses)', () => {
  bench('pipeline — no variants', () => {
    const tag = noVariantRuntime.resolveTag(undefined)
    const merged = noVariantRuntime.resolveProps({ className: 'extra' })
    noVariantRuntime.resolveClasses(tag, merged, 'extra', undefined)
  })

  bench('pipeline — with variants (warm)', () => {
    const tag = variantRuntime.resolveTag(undefined)
    const merged = variantRuntime.resolveProps(WARM_PROPS)
    variantRuntime.resolveClasses(tag, merged, undefined, undefined)
  })
})
