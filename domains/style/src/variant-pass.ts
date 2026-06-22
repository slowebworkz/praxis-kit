import type { Pass } from '@pk2/pipeline'
import type { StyleContext } from './types'

export interface VariantConfig {
  variants: Record<string, Record<string, string>>
  presets?: Record<string, Record<string, string>>
}

export function createVariantPass(
  activeProps: Record<string, unknown>,
  config: VariantConfig,
): Pass<StyleContext> {
  return {
    name: 'variant',
    execute() {
      const preset = typeof activeProps['preset'] === 'string' ? activeProps['preset'] : undefined
      const presetDefaults =
        preset !== undefined && config.presets?.[preset] !== undefined ? config.presets[preset] : {}
      const resolved: Record<string, unknown> = { ...presetDefaults, ...activeProps }

      const classes: string[] = []
      for (const [key, valueMap] of Object.entries(config.variants)) {
        const active = resolved[key]
        if (typeof active === 'string') {
          const cls = valueMap[active]
          if (cls !== undefined) classes.push(cls)
        }
      }

      return { context: { classes } }
    },
  }
}
