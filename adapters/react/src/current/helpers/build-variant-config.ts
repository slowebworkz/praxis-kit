import type { ClassName } from '@praxis-kit/core'
import type { StringMap } from '@pk2/foundation'
import type { VariantConfig } from '@pk2/style'

export type VariantTable<T> = StringMap<StringMap<T>>
export type VariantRecord = VariantTable<ClassName>
export type PresetValues = Record<string, string>
export type PresetRecord = StringMap<PresetValues>
export type CompoundRecord = StringMap<ClassName> & { class: ClassName }

export function flattenClassName(cls: ClassName): string {
  return Array.isArray(cls) ? cls.join(' ') : cls
}

function mapVariantRecord<T, U>(source: VariantTable<T>, mapper: (value: T) => U): VariantTable<U> {
  const result: VariantTable<U> = {}
  for (const key in source) {
    const inner: StringMap<U> = {}
    for (const val in source[key]) {
      inner[val] = mapper(source[key][val]!)
    }
    result[key] = inner
  }
  return result
}

export function buildVariantConfig(
  variants?: VariantRecord,
  presets?: PresetRecord,
  defaults?: Record<string, string>,
): VariantConfig {
  return {
    variants: mapVariantRecord(variants ?? {}, flattenClassName),
    ...(presets !== undefined && Object.keys(presets).length > 0 && { presets }),
    ...(defaults !== undefined && Object.keys(defaults).length > 0 && { defaults }),
  }
}
