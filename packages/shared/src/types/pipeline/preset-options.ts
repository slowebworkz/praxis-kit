import type { PresetTarget, VariantMap } from '../variants'

export interface PresetOptions<TVariants extends VariantMap = VariantMap> {
  presetMap?: Record<string, PresetTarget<TVariants>>
}
