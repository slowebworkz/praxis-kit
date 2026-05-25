import { describe, expect, it } from 'vitest'
import { diagnoseClassPipeline } from './diagnose-class-pipeline'

describe('diagnoseClassPipeline', () => {
  it('returns base class for primitive component', () => {
    const d = diagnoseClassPipeline({ baseClassName: 'box' }, 'div', {})
    expect(d.base).toBe('box')
    expect(d.compounds).toEqual([])
    expect(d.tagMapClass).toBeNull()
    expect(d.final).toBe('box')
  })

  it('applies tag-map class for matching tag', () => {
    const d = diagnoseClassPipeline(
      { baseClassName: 'link', tagMap: { a: 'link--anchor' } },
      'a',
      {},
    )
    expect(d.tagMapClass).toBe('link--anchor')
    expect(d.tagMapBypassed).toBe(false)
    expect(d.final).toBe('link link--anchor')
  })

  it('returns null tagMapClass for unmatched tag', () => {
    const d = diagnoseClassPipeline(
      { baseClassName: 'link', tagMap: { a: 'link--anchor' } },
      'button',
      {},
    )
    expect(d.tagMapClass).toBeNull()
    expect(d.final).toBe('link')
  })

  it('bypasses tag-map when variantKey is active but still reports what the class would have been', () => {
    const d = diagnoseClassPipeline(
      { baseClassName: 'link', tagMap: { a: 'link--anchor' }, presetMap: { ghost: {} } },
      'a',
      {},
      undefined,
      'ghost',
    )
    expect(d.tagMapBypassed).toBe(true)
    expect(d.tagMapClass).toBe('link--anchor')
    expect(d.final).toBe('link')
  })

  it('returns null tagMapClass when tag is a component reference', () => {
    const Comp = () => null
    const d = diagnoseClassPipeline({ baseClassName: 'box', tagMap: { div: 'box--div' } }, Comp, {})
    expect(d.tagMapClass).toBeNull()
  })

  it('reports preset values when key is found', () => {
    const d = diagnoseClassPipeline(
      {
        baseClassName: 'btn',
        variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } },
        presetMap: { compact: { size: 'sm' } },
      },
      'button',
      {},
      undefined,
      'compact',
    )
    expect(d.presetKey).toBe('compact')
    expect(d.presetValues).toEqual({ size: 'sm' })
    expect(d.effectiveVariants['size']).toBe('sm')
  })

  it('reports null presetValues when key not found in presetMap', () => {
    const d = diagnoseClassPipeline(
      { baseClassName: 'btn', presetMap: { ghost: {} } },
      'button',
      {},
      undefined,
      'missing',
    )
    expect(d.presetKey).toBe('missing')
    expect(d.presetValues).toBeNull()
  })

  it('reports undefined presetKey when no variantKey', () => {
    const d = diagnoseClassPipeline({ baseClassName: 'btn' }, 'button', {})
    expect(d.presetKey).toBeUndefined()
    expect(d.presetValues).toBeNull()
  })

  it('includes defaultVariants in effectiveVariants', () => {
    const d = diagnoseClassPipeline(
      {
        variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } },
        defaultVariants: { size: 'sm' },
      },
      'button',
      {},
    )
    expect(d.effectiveVariants['size']).toBe('sm')
  })

  it('caller props override defaults in effectiveVariants', () => {
    const d = diagnoseClassPipeline(
      {
        variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } },
        defaultVariants: { size: 'sm' },
      },
      'button',
      { size: 'lg' },
    )
    expect(d.effectiveVariants['size']).toBe('lg')
    expect(d.final).toContain('btn--lg')
  })

  it('traces a fired compound', () => {
    const d = diagnoseClassPipeline(
      {
        baseClassName: 'btn',
        variants: {
          size: { sm: 'btn--sm', lg: 'btn--lg' },
          intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
        },
        compoundVariants: [{ size: 'sm', intent: 'primary', class: 'btn--sm-primary' }],
      },
      'button',
      { size: 'sm', intent: 'primary' },
    )
    expect(d.compounds[0]?.fired).toBe(true)
    expect(d.compounds[0]?.mismatches).toEqual([])
    expect(d.final).toContain('btn--sm-primary')
  })

  it('traces a non-fired compound with mismatches', () => {
    const d = diagnoseClassPipeline(
      {
        baseClassName: 'btn',
        variants: {
          size: { sm: 'btn--sm', lg: 'btn--lg' },
          intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
        },
        compoundVariants: [{ size: 'sm', intent: 'primary', class: 'btn--sm-primary' }],
      },
      'button',
      { size: 'sm' },
    )
    expect(d.compounds[0]?.fired).toBe(false)
    expect(d.compounds[0]?.mismatches).toEqual([
      { key: 'intent', expected: 'primary', got: undefined },
    ])
    expect(d.final).not.toContain('btn--sm-primary')
  })

  it('traces array conditions — fires when value is in the array', () => {
    const d = diagnoseClassPipeline(
      {
        baseClassName: 'btn',
        variants: { size: { sm: 'btn--sm', lg: 'btn--lg', xl: 'btn--xl' } },
        compoundVariants: [{ size: ['sm', 'lg'], class: 'btn--small-or-large' }],
      },
      'button',
      { size: 'sm' },
    )
    expect(d.compounds[0]?.fired).toBe(true)
    expect(d.final).toContain('btn--small-or-large')
  })

  it('traces array conditions — mismatch when value is not in the array', () => {
    const d = diagnoseClassPipeline(
      {
        baseClassName: 'btn',
        variants: { size: { sm: 'btn--sm', lg: 'btn--lg', xl: 'btn--xl' } },
        compoundVariants: [{ size: ['sm', 'lg'], class: 'btn--small-or-large' }],
      },
      'button',
      { size: 'xl' },
    )
    expect(d.compounds[0]?.fired).toBe(false)
    expect(d.compounds[0]?.mismatches[0]).toMatchObject({ key: 'size', got: 'xl' })
  })

  it('includes callerClass in final', () => {
    const d = diagnoseClassPipeline({ baseClassName: 'box' }, 'div', {}, 'custom-class')
    expect(d.callerClass).toBe('custom-class')
    expect(d.final).toBe('box custom-class')
  })

  it('final matches what resolveClasses would produce', () => {
    const d = diagnoseClassPipeline(
      {
        baseClassName: 'btn',
        tagMap: { a: 'btn--link' },
        variants: {
          size: { sm: 'btn--sm', lg: 'btn--lg' },
          intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
        },
        defaultVariants: { size: 'sm' },
        compoundVariants: [{ size: 'sm', intent: 'primary', class: 'btn--sm-primary' }],
      },
      'button',
      { intent: 'primary' },
      'extra',
    )
    expect(d.final).toBe('btn btn--sm btn--primary btn--sm-primary extra')
  })
})
