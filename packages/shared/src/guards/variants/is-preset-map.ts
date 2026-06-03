import type { PresetMap } from '../../types'
import { isRecord } from '../foundational'
import { isVariantSelection } from './is-variant-selection'

export function isPresetMap(value: unknown): value is PresetMap {
  if (!isRecord(value)) return false
  return Object.values(value).every(isVariantSelection)
}
