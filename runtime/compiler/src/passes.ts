import type { Pass } from '@pk2/pipeline'
import type { CapabilityMap, MetadataMap, SlotName, VariantMap } from '@pk2/foundation'
import type { CompilerContext } from './types'

function createContextPass(context: Partial<CompilerContext>, name: string): Pass<CompilerContext> {
  const snapshot = structuredClone(context)
  return {
    name,
    execute: () => ({ context: snapshot }),
  }
}

export function contributeSlots(slots: readonly SlotName[], name: string): Pass<CompilerContext> {
  return createContextPass({ slots }, name)
}

export function contributeVariants(variants: VariantMap, name: string): Pass<CompilerContext> {
  return createContextPass({ variants }, name)
}

export function contributeCapabilities(
  capabilities: CapabilityMap,
  name: string,
): Pass<CompilerContext> {
  return createContextPass({ capabilities }, name)
}

export function contributeMetadata(metadata: MetadataMap, name: string): Pass<CompilerContext> {
  return createContextPass({ metadata }, name)
}
