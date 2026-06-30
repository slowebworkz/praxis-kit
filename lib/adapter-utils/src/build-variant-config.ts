import type { StringMap } from '@pk2/pipeline'
import type { CompoundVariant, VariantConfig } from '@pk2/style'
import type { ClassName } from '@praxis-kit/core'
import { iterate } from '@praxis-kit/primitive'

export type VariantTable<T> = StringMap<StringMap<T>>
export type VariantRecord = VariantTable<ClassName>
export type PresetValues = StringMap<string>
export type Defaults = PresetValues
export type PresetRecord = StringMap<PresetValues>
export type CompoundRecord = StringMap<ClassName> & { class: ClassName }

export function flattenClassName(cls: ClassName): string {
  return Array.isArray(cls) ? cls.join(' ') : cls
}

function mapVariantRecord<T, U>(source: VariantTable<T>, mapper: (value: T) => U): VariantTable<U> {
  return iterate.mapValues<VariantTable<T>, StringMap<U>>(source, (inner) =>
    iterate.mapValues<StringMap<T>, U>(inner, mapper),
  )
}

export function buildVariantConfig(
  variants?: VariantRecord,
  presets?: PresetRecord,
  defaults?: Defaults,
  compounds?: ReadonlyArray<CompoundRecord>,
): VariantConfig {
  return {
    variants: mapVariantRecord(variants ?? {}, flattenClassName),
    ...(presets !== undefined && Object.keys(presets).length > 0 && { presets }),
    ...(defaults !== undefined && Object.keys(defaults).length > 0 && { defaults }),
    ...(compounds !== undefined &&
      compounds.length > 0 && {
        compounds: compounds as unknown as ReadonlyArray<CompoundVariant>,
      }),
  }
}
