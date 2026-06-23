import type { ClassName } from '@praxis-kit/core'
import type { StringMap } from '@pk2/foundation'
import type { VariantConfig } from '@pk2/style'

export type VariantMapRecord<T> = StringMap<StringMap<T>>
export type VariantRecord = VariantMapRecord<ClassName>
export type PresetRecord = VariantMapRecord<string>
export type CompoundRecord = StringMap<ClassName> & { class: ClassName }

export function flattenClassName(cls: ClassName): string {
  return Array.isArray(cls) ? cls.join(' ') : cls
}

function mapVariantRecord<T, U>(
  source: VariantMapRecord<T>,
  mapper: (value: T) => U,
): VariantMapRecord<U> {
  const result: VariantMapRecord<U> = {}
  for (const [key, valueMap] of Object.entries(source)) {
    const inner: StringMap<U> = {}
    for (const [val, value] of Object.entries(valueMap)) {
      inner[val] = mapper(value as T)
    }
    result[key] = inner
  }
  return result
}

export function buildVariantConfig(
  variants?: VariantRecord,
  presets?: PresetRecord,
): VariantConfig {
  return {
    variants: mapVariantRecord(variants ?? {}, flattenClassName),
    ...(presets !== undefined && Object.keys(presets).length > 0 && { presets }),
  }
}
