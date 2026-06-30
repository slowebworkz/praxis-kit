import type { RecipeMap } from '../../types'
import { isRecord } from '../foundational'
import { isVariantSelection } from './is-variant-selection'

export function isRecipeMap(value: unknown): value is RecipeMap {
  if (!isRecord(value)) return false
  return Object.values(value).every(isVariantSelection)
}
