import type { StyleContext } from './types'
import { iterate } from '@praxis-kit/primitive'

/** Flat compound variant: all keys except `class` are condition key:value pairs. */
export type CompoundVariant = { readonly class: string | readonly string[] } & Record<
  string,
  string | readonly string[]
>

export interface VariantConfig {
  variants: Record<string, Record<string, string>>
  presets?: Record<string, Record<string, string>>
  defaults?: Record<string, string>
  compounds?: ReadonlyArray<CompoundVariant>
}

export interface VariantPass {
  name: string
  execute(context: Readonly<StyleContext>): { context: { classes: string[] } }
}

export function createVariantPass(
  activeProps: Record<string, unknown>,
  config: VariantConfig,
): VariantPass {
  return {
    name: 'variant',
    execute() {
      const preset = typeof activeProps['preset'] === 'string' ? activeProps['preset'] : undefined
      const presetDefaults =
        preset !== undefined && config.presets?.[preset] !== undefined ? config.presets[preset] : {}
      // Merge order: factory defaults < preset values < explicitly set props
      const resolved: Record<string, unknown> = {
        ...config.defaults,
        ...presetDefaults,
        ...activeProps,
      }

      const classes: string[] = []
      iterate.forEachEntry(config.variants, (key, valueMap) => {
        const active = resolved[key]
        if (typeof active === 'string') {
          const cls = valueMap[active]
          if (cls !== undefined) classes.push(cls)
        }
      })

      return { context: { classes } }
    },
  }
}
