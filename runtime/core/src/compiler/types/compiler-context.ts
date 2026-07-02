import type { ComponentContext } from '../../types'
import type { SlotName, VariantMap } from '@praxis-kit/pipeline'

export interface CompilerContext extends ComponentContext {
  slots?: readonly SlotName[]
  variants?: VariantMap
  precomputed?: { variantLookup: Record<string, string> }
}
