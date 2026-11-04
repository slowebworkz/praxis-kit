import type { StringMap } from '@praxis-kit/primitive'
import type { AnyRecord, VariantConditionValue } from './primitives'

export type CompoundTrace = {
  conditions: StringMap<VariantConditionValue>
  class: string | string[]
  fired: boolean
  mismatches: Array<{ key: string; expected: VariantConditionValue; got: unknown }>
}

export type ClassDiagnosis = {
  base: string
  tagMapClass: string | null
  tagMapBypassed: boolean
  recipeKey: string | undefined
  presetValues: AnyRecord | null
  effectiveVariants: AnyRecord
  compounds: CompoundTrace[]
  callerClass: string | undefined
  final: string
}
