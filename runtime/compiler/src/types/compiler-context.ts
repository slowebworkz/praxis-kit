import type { ComponentContext } from '@pk2/core'
import type { SlotName, VariantMap } from '@pk2/pipeline'

export interface CompilerContext extends ComponentContext {
  slots?: readonly SlotName[]
  variants?: VariantMap
  precomputed?: { variantLookup: Record<string, string> }
}
