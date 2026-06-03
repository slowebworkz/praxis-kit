import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'

import { createTailwindPipeline, _resetPipelineWarns } from './create-tailwind-pipeline'

function resolve(
  plugin: ReturnType<typeof createTailwindPipeline>,
  className = '',
  layout?: 'flex' | 'grid',
) {
  const props = layout === 'flex' ? { flex: true } : layout === 'grid' ? { grid: true } : {}
  return plugin.pipeline('div', props, className, undefined)
}

describe('createTailwindPipeline — none mode (no layout prop)', () => {
  const pipeline = createTailwindPipeline({ baseClassName: 'base' }, false)

  it('strips the flex display literal and flex utilities (and gap), keeps plain utilities', () => {
    const cls = resolve(pipeline, 'flex flex-col gap-4 rounded')
    expect(cls).not.toMatch(/\bflex\b/)
    expect(cls).not.toMatch(/\bflex-col\b/)
    expect(cls).not.toMatch(/\bgap-4\b/) // gap requires an active layout mode
    expect(cls).toMatch(/\bbase\b/)
    expect(cls).toMatch(/\brounded\b/)
  })

  it('strips the grid display literal and grid utilities', () => {
    const cls = resolve(pipeline, 'grid grid-cols-3 col-span-2 rounded')
    expect(cls).not.toMatch(/\bgrid\b/)
    expect(cls).not.toMatch(/\bgrid-cols-3\b/)
    expect(cls).not.toMatch(/\bcol-span-2\b/)
    expect(cls).toMatch(/\brounded\b/)
  })
})

describe('createTailwindPipeline — flex active', () => {
  const pipeline = createTailwindPipeline({}, false)

  it('prepends flex to className', () => {
    expect(resolve(pipeline, 'rounded', 'flex')).toMatch(/\bflex\b/)
  })

  it('strips grid-exclusive classes', () => {
    const cls = resolve(pipeline, 'grid grid-cols-3 col-span-2 row-span-1 auto-cols-fr', 'flex')
    expect(cls).not.toMatch(/\bgrid\b/)
    expect(cls).not.toMatch(/\bgrid-cols-3\b/)
    expect(cls).not.toMatch(/\bcol-span-2\b/)
    expect(cls).not.toMatch(/\brow-span-1\b/)
    expect(cls).not.toMatch(/\bauto-cols-fr\b/)
  })

  it('preserves flex-exclusive classes', () => {
    const cls = resolve(pipeline, 'flex-row flex-wrap grow shrink-0 basis-1/2', 'flex')
    expect(cls).toMatch(/\bflex-row\b/)
    expect(cls).toMatch(/\bgrow\b/)
    expect(cls).toMatch(/\bshrink-0\b/)
    expect(cls).toMatch(/\bbasis-1\/2\b/)
  })

  it('preserves gap classes', () => {
    const cls = resolve(pipeline, 'gap-4 gap-x-2 gap-y-6', 'flex')
    expect(cls).toMatch(/\bgap-4\b/)
    expect(cls).toMatch(/\bgap-x-2\b/)
    expect(cls).toMatch(/\bgap-y-6\b/)
  })

  it('preserves layout-agnostic classes', () => {
    const cls = resolve(pipeline, 'rounded-lg p-4 text-sm', 'flex')
    expect(cls).toMatch(/\brounded-lg\b/)
    expect(cls).toMatch(/\bp-4\b/)
    expect(cls).toMatch(/\btext-sm\b/)
  })
})

describe('createTailwindPipeline — grid active', () => {
  const pipeline = createTailwindPipeline({}, false)

  it('prepends grid to className', () => {
    expect(resolve(pipeline, 'rounded', 'grid')).toMatch(/\bgrid\b/)
  })

  it('strips flex-exclusive classes', () => {
    const cls = resolve(pipeline, 'flex flex-row grow shrink-0 basis-1/2', 'grid')
    expect(cls).not.toMatch(/\bflex\b/)
    expect(cls).not.toMatch(/\bflex-row\b/)
    expect(cls).not.toMatch(/\bgrow\b/)
    expect(cls).not.toMatch(/\bshrink-0\b/)
    expect(cls).not.toMatch(/\bbasis-1\/2\b/)
  })

  it('preserves grid-exclusive classes', () => {
    const cls = resolve(pipeline, 'grid-cols-3 col-span-2 row-span-1 auto-cols-fr', 'grid')
    expect(cls).toMatch(/\bgrid-cols-3\b/)
    expect(cls).toMatch(/\bcol-span-2\b/)
    expect(cls).toMatch(/\brow-span-1\b/)
    expect(cls).toMatch(/\bauto-cols-fr\b/)
  })

  it('preserves gap classes', () => {
    const cls = resolve(pipeline, 'gap-4 gap-x-2 gap-y-6', 'grid')
    expect(cls).toMatch(/\bgap-4\b/)
    expect(cls).toMatch(/\bgap-x-2\b/)
    expect(cls).toMatch(/\bgap-y-6\b/)
  })
})

describe('createTailwindPipeline — inline layout variants', () => {
  const pipeline = createTailwindPipeline({}, false)

  it('preserves inline-flex when flex is active', () => {
    expect(resolve(pipeline, 'inline-flex rounded', 'flex')).toMatch(/\binline-flex\b/)
  })

  it('strips inline-flex when grid is active', () => {
    expect(resolve(pipeline, 'inline-flex rounded', 'grid')).not.toMatch(/\binline-flex\b/)
  })

  it('preserves inline-grid when grid is active', () => {
    expect(resolve(pipeline, 'inline-grid rounded', 'grid')).toMatch(/\binline-grid\b/)
  })

  it('strips inline-grid when flex is active', () => {
    expect(resolve(pipeline, 'inline-grid rounded', 'flex')).not.toMatch(/\binline-grid\b/)
  })
})

describe('createTailwindPipeline — conditional tokens', () => {
  const pipeline = createTailwindPipeline({}, false)

  it('includes [&.flex]: token when flex is active', () => {
    expect(resolve(pipeline, '[&.flex]:items-center rounded', 'flex')).toMatch(
      /\[&\.flex\]:items-center/,
    )
  })

  it('strips [&.flex]: token when grid is active', () => {
    expect(resolve(pipeline, '[&.flex]:items-center rounded', 'grid')).not.toMatch(
      /\[&\.flex\]:items-center/,
    )
  })

  it('strips [&.flex]: token when no layout is active (none mode)', () => {
    expect(resolve(pipeline, '[&.flex]:items-center rounded')).not.toMatch(
      /\[&\.flex\]:items-center/,
    )
  })

  it('includes [&.grid]: token when grid is active', () => {
    expect(resolve(pipeline, '[&.grid]:grid-cols-3 rounded', 'grid')).toMatch(
      /\[&\.grid\]:grid-cols-3/,
    )
  })

  it('strips [&.grid]: token when flex is active', () => {
    expect(resolve(pipeline, '[&.grid]:grid-cols-3 rounded', 'flex')).not.toMatch(
      /\[&\.grid\]:grid-cols-3/,
    )
  })
})

describe('createTailwindPipeline — arbitrary variant prefixes', () => {
  const pipeline = createTailwindPipeline({}, false)

  it('strips prefixed grid class when flex is active', () => {
    const cls = resolve(pipeline, 'data-[orientation=horizontal]:grid-cols-3 rounded', 'flex')
    expect(cls).not.toMatch(/grid-cols-3/)
    expect(cls).toMatch(/\brounded\b/)
  })

  it('preserves prefixed flex class when flex is active', () => {
    const cls = resolve(pipeline, 'data-[orientation=horizontal]:flex-row rounded', 'flex')
    expect(cls).toMatch(/flex-row/)
    expect(cls).toMatch(/\brounded\b/)
  })

  it('handles stacked prefixes', () => {
    const cls = resolve(pipeline, 'sm:hover:flex-row md:grid-cols-2 p-4', 'flex')
    expect(cls).toMatch(/flex-row/)
    expect(cls).not.toMatch(/grid-cols-2/)
    expect(cls).toMatch(/\bp-4\b/)
  })

  it('handles colon inside brackets without false positive', () => {
    const cls = resolve(
      pipeline,
      'data-[foo:bar]:flex-row data-[foo:bar]:grid-cols-3 rounded',
      'flex',
    )
    expect(cls).toMatch(/flex-row/)
    expect(cls).not.toMatch(/grid-cols-3/)
  })
})

describe('createTailwindPipeline — layout param overrides className tokens', () => {
  const pipeline = createTailwindPipeline({}, false)

  it('flex param forces flex mode even when className contains grid tokens', () => {
    const cls = resolve(pipeline, 'grid grid-cols-3 gap-4 rounded', 'flex')
    expect(cls).toMatch(/\bflex\b/)
    expect(cls).toMatch(/\brounded\b/)
    expect(cls).toMatch(/\bgap-4\b/)
    expect(cls).not.toMatch(/\bgrid-cols-3\b/)
  })

  it('grid param forces grid mode even when className contains flex tokens', () => {
    const cls = resolve(pipeline, 'flex flex-col gap-4 rounded', 'grid')
    expect(cls).toMatch(/\bgrid\b/)
    expect(cls).toMatch(/\brounded\b/)
    expect(cls).toMatch(/\bgap-4\b/)
    expect(cls).not.toMatch(/\bflex-col\b/)
  })
})

describe('createTailwindPipeline — flex/grid mutual exclusion', () => {
  // flex+grid conflict warning fires regardless of strict — it is a misuse, not a
  // contract violation. strict gates the layout-literal and dead-variant warnings only.
  const pipeline = createTailwindPipeline({}, false)

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('flex takes precedence when both are set', () => {
    const cls = pipeline.pipeline(
      'div',
      { flex: true, grid: true },
      'flex-row grid-cols-2',
      undefined,
    )
    expect(cls).toMatch(/\bflex\b/)
    expect(cls).not.toMatch(/\bgrid\b/)
  })

  it('emits a console.warn when both are set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    pipeline.pipeline('div', { flex: true, grid: true }, '', undefined)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/flex.*grid|grid.*flex/i)
  })

  it('does not warn when only flex is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    pipeline.pipeline('div', { flex: true }, '', undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not warn when only grid is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    pipeline.pipeline('div', { grid: true }, '', undefined)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('createTailwindPipeline — reserved layout literals', () => {
  const pipeline = createTailwindPipeline({}, 'warn')

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('warns when a flex display literal appears in the resolved input', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    pipeline.pipeline('div', { flex: true }, 'flex rounded', undefined)
    expect(warn.mock.calls.some((c) => /reserved layout class/i.test(String(c[0])))).toBe(true)
  })

  it('warns when a grid display literal appears under none mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    pipeline.pipeline('div', {}, 'grid rounded', undefined)
    expect(warn.mock.calls.some((c) => /reserved layout class/i.test(String(c[0])))).toBe(true)
  })

  it('does not warn when only utilities (no display literal) are present', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    pipeline.pipeline('div', { flex: true }, 'flex-col gap-4 rounded', undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when strict is false', () => {
    const silent = createTailwindPipeline({}, false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    silent.pipeline('div', { flex: true }, 'flex rounded', undefined)
    expect(warn.mock.calls.some((c) => /reserved layout class/i.test(String(c[0])))).toBe(false)
  })
})

describe('createTailwindPipeline — dead-variant detection (Case B)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // A component whose `cols` variant emits only grid utilities.
  const make = () =>
    createTailwindPipeline(
      {
        variants: {
          cols: { '2': 'grid-cols-2', '3': 'grid-cols-3' },
          pad: { sm: 'p-2', lg: 'p-8' },
        },
      },
      'warn',
    )

  function deadVariantWarned(warn: ReturnType<typeof vi.spyOn>): boolean {
    return warn.mock.calls.some((c: unknown[]) =>
      /produces nothing in this mode/i.test(String(c[0])),
    )
  }

  it('warns when a grid-only variant (via prop) is fully stripped in flex mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    make().pipeline('div', { flex: true, cols: '2' }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(true)
    expect(warn.mock.calls.some((c) => /cols=2/.test(String(c[0])))).toBe(true)
  })

  it('warns when a grid-only variant is dead in none mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    make().pipeline('div', { cols: '3' }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(true)
  })

  it('does not warn when the variant survives (grid mode)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    make().pipeline('div', { grid: true, cols: '2' }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(false)
  })

  it('does not warn for a non-layout variant (always survives)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    make().pipeline('div', { flex: true, pad: 'lg' }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(false)
  })

  it('detects a dead variant activated via preset (variantKey)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const pipeline = createTailwindPipeline(
      { variants: { cols: { '2': 'grid-cols-2' } }, presetMap: { grid2: { cols: '2' } } },
      'warn',
    )
    pipeline.pipeline('div', { flex: true }, '', 'grid2')
    expect(deadVariantWarned(warn)).toBe(true)
  })

  it('detects a dead variant from defaultVariants', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const pipeline = createTailwindPipeline(
      { variants: { cols: { '2': 'grid-cols-2' } }, defaultVariants: { cols: '2' } },
      'warn',
    )
    pipeline.pipeline('div', { flex: true }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(true)
  })

  it('does not warn for a variant whose contribution only partially strips', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const pipeline = createTailwindPipeline(
      // grid-cols-2 strips in flex mode, but rounded survives → not dead.
      { variants: { box: { a: 'grid-cols-2 rounded' } } },
      'warn',
    )
    pipeline.pipeline('div', { flex: true, box: 'a' }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(false)
  })

  it('does not warn for a dimension that participates in a compound variant', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const pipeline = createTailwindPipeline(
      {
        // cols=2 alone strips in flex mode, but a compound on `cols` may rescue it,
        // so the dimension is skipped to avoid a false positive.
        variants: { cols: { '2': 'grid-cols-2' }, size: { lg: 'text-lg' } },
        compoundVariants: [{ cols: '2', size: 'lg', class: 'flex-row' }],
      },
      'warn',
    )
    pipeline.pipeline('div', { flex: true, cols: '2' }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(false)
  })

  it('is silent when strict is false', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const pipeline = createTailwindPipeline({ variants: { cols: { '2': 'grid-cols-2' } } }, false)
    pipeline.pipeline('div', { flex: true, cols: '2' }, '', undefined)
    expect(deadVariantWarned(warn)).toBe(false)
  })
})

describe('createTailwindPipeline — baseClassName layout stripping', () => {
  it('strips layout classes from baseClassName when no layout is active (none mode)', () => {
    const pipeline = createTailwindPipeline({ baseClassName: 'flex flex-col gap-4 rounded' }, false)
    const cls = resolve(pipeline)
    expect(cls).not.toMatch(/\bflex\b/)
    expect(cls).not.toMatch(/\bflex-col\b/)
    expect(cls).not.toMatch(/\bgap-4\b/)
    expect(cls).toMatch(/\brounded\b/)
  })

  it('preserves layout classes from baseClassName when flex is active', () => {
    const pipeline = createTailwindPipeline({ baseClassName: 'items-center gap-4 rounded' }, false)
    const cls = resolve(pipeline, '', 'flex')
    expect(cls).toMatch(/\bitems-center\b/)
    expect(cls).toMatch(/\bgap-4\b/)
    expect(cls).toMatch(/\brounded\b/)
  })
})

describe('createTailwindPipeline — async-warn mode', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    _resetPipelineWarns()
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('does not call console.warn synchronously for reserved layout literals', () => {
    const pipeline = createTailwindPipeline({ baseClassName: 'flex' }, 'async-warn')
    resolve(pipeline, '')
    expect(warn).not.toHaveBeenCalled()
  })

  it('calls console.warn after microtask flush for reserved layout literals', async () => {
    const pipeline = createTailwindPipeline({ baseClassName: 'flex' }, 'async-warn')
    resolve(pipeline, '')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/reserved layout/i)
  })

  it('does not call console.warn synchronously for dead variants', () => {
    const pipeline = createTailwindPipeline(
      { variants: { cols: { '2': 'grid-cols-2' } } },
      'async-warn',
    )
    pipeline.pipeline('div', { flex: true, cols: '2' }, '', undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('calls console.warn after microtask flush for dead variants', async () => {
    const pipeline = createTailwindPipeline(
      { variants: { cols: { '2': 'grid-cols-2' } } },
      'async-warn',
    )
    pipeline.pipeline('div', { flex: true, cols: '2' }, '', undefined)
    await Promise.resolve()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/produces nothing in this mode/i)
  })

  it('deduplicates identical messages within the same tick', async () => {
    const pipeline = createTailwindPipeline({ baseClassName: 'flex' }, 'async-warn')
    resolve(pipeline, '')
    resolve(pipeline, '')
    resolve(pipeline, '')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('batches reserved-literal and dead-variant warnings into one microtask flush', async () => {
    // baseClassName 'flex' triggers reserved-literal; grid-only variant in flex mode triggers dead-variant
    const pipeline = createTailwindPipeline(
      { baseClassName: 'flex', variants: { cols: { '2': 'grid-cols-2' } } },
      'async-warn',
    )
    pipeline.pipeline('div', { flex: true, cols: '2' }, '', undefined)
    expect(warn).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(2)
  })
})
