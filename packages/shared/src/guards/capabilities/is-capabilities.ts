import type { Capabilities } from '../../types'
import { isFunction, isRecord } from '../foundational'

export function isCapability(value: unknown): value is Capabilities {
  if (!isRecord(value)) return false
  const { createClassPipeline, AriaEngine } = value
  if (createClassPipeline !== undefined && !isFunction(createClassPipeline)) return false
  if (AriaEngine !== undefined && !isFunction(AriaEngine)) return false
  return true
}

export function isCapabilityMap(value: unknown): value is Record<string, Capabilities> {
  if (!isRecord(value)) return false
  return Object.values(value).every(isCapability)
}

export function isCapabilities(value: unknown): value is Capabilities {
  return isCapability(value)
}
