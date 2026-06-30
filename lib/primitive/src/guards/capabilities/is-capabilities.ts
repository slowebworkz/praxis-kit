import type { Capabilities } from '../../types'
import { isDefined } from '../foundational/is-defined'
import { isFunction } from '../foundational/is-function'
import { isRecord } from '../foundational/is-record'

export function isCapability(value: unknown): value is Capabilities {
  if (!isRecord(value)) return false
  const { createClassPipeline, AriaEngine } = value
  if (isDefined(createClassPipeline) && !isFunction(createClassPipeline)) return false
  if (isDefined(AriaEngine) && !isFunction(AriaEngine)) return false
  return true
}

export function isCapabilityMap(value: unknown): value is Record<string, Capabilities> {
  if (!isRecord(value)) return false
  return Object.values(value).every(isCapability)
}

export function isCapabilities(value: unknown): value is Capabilities {
  return isCapability(value)
}
