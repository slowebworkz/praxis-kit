import { describe, expect, it, vi } from 'vitest'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type {
  ClassPipelineOptions,
  ClassPluginFactory,
  CompositionStyleOptions,
  VariantMap,
} from '@praxis-kit/styling'
import { createSelectedCompositionClassPipeline } from './composition-style'

describe('createSelectedCompositionClassPipeline', () => {
  const options: CompositionStyleOptions = {
    primary: {
      baseClassName: 'primary-base',
      variants: { size: { sm: 'primary-sm', lg: 'primary-lg' } },
      defaultVariants: { size: 'lg' },
    },
    partner: {
      baseClassName: 'partner-base',
      variants: { tone: { quiet: 'partner-quiet' } },
      defaultVariants: { tone: 'quiet' },
    },
  }

  it('constructs the selected plugin once with merged options and the supplied diagnostics', () => {
    const pipeline = vi.fn(() => 'plugin-classes')
    const factory = vi.fn(
      (mergedOptions: ClassPipelineOptions<VariantMap>, diagnostics: Diagnostics) => {
        expect(diagnostics).toBe(silentDiagnostics)
        expect(mergedOptions.baseClassName).toBe('partner-base primary-base')
        expect(mergedOptions.variants).toEqual({
          tone: { quiet: 'partner-quiet' },
          size: { sm: 'primary-sm', lg: 'primary-lg' },
        })
        expect(mergedOptions.defaultVariants).toEqual({ size: 'lg', tone: 'quiet' })
        return { pipeline }
      },
    ) as unknown as ClassPluginFactory

    const resolved = createSelectedCompositionClassPipeline(options, factory, silentDiagnostics)

    expect(factory).toHaveBeenCalledTimes(1)
    expect(resolved.pluginResult).toBeDefined()
    expect(resolved.classPipeline('div', {}, undefined, undefined)).toBe('plugin-classes')
    expect(pipeline).toHaveBeenCalledTimes(1)
  })

  it('uses the standard class pipeline when no plugin factory is selected', () => {
    const resolved = createSelectedCompositionClassPipeline(options, undefined, silentDiagnostics)

    expect(resolved.pluginResult).toBeUndefined()
    const classes = resolved.classPipeline(
      'div',
      { size: 'sm', tone: 'quiet' },
      undefined,
      undefined,
    )
    expect(classes).toContain('partner-base primary-base')
    expect(classes).toContain('primary-sm')
  })
})
