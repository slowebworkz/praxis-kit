import type { Pass, CapabilityMap, MetadataMap, SlotName, VariantMap } from '@pk2/pipeline'
import type { CompilerContext } from './types'

function field<K extends keyof CompilerContext>(
  key: K,
  value: CompilerContext[K] | undefined,
): Pick<CompilerContext, K> | undefined {
  return value === undefined ? undefined : ({ [key]: value } as Pick<CompilerContext, K>)
}

function contribute<TContext>(
  name: string,
  context: Partial<TContext> | undefined,
): Pass<TContext> | undefined {
  if (context === undefined) return undefined
  const snapshot = structuredClone(context)
  return {
    name,
    execute() {
      return { context: snapshot }
    },
  }
}

export function contributeSlots(
  slots: readonly SlotName[] | undefined,
  name = 'slots',
): Pass<CompilerContext> | undefined {
  return contribute<CompilerContext>(name, field('slots', slots))
}

export function contributeVariants(
  variants: VariantMap | undefined,
  name = 'variants',
): Pass<CompilerContext> | undefined {
  return contribute<CompilerContext>(name, field('variants', variants))
}

export function contributeCapabilities(
  capabilities: CapabilityMap | undefined,
  name = 'capabilities',
): Pass<CompilerContext> | undefined {
  return contribute<CompilerContext>(name, field('capabilities', capabilities))
}

export function contributeMetadata(
  metadata: MetadataMap | undefined,
  name = 'metadata',
): Pass<CompilerContext> | undefined {
  return contribute<CompilerContext>(name, field('metadata', metadata))
}
