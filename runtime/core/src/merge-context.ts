import type { MergeStrategy } from '@pk2/pipeline'
import type { ComponentContext } from './types'

function mergeRecord<T extends object>(previous: T, incoming?: Partial<T>): T {
  return { ...previous, ...incoming }
}

function append<T>(previous: T[], incoming?: T[]): T[] {
  return [...previous, ...(incoming ?? [])]
}

export const componentMergeStrategy: MergeStrategy<ComponentContext> = {
  merge(previous, incoming) {
    const { identity, capabilities, metadata, diagnostics, ...rest } = incoming
    return {
      ...previous,
      ...rest,
      identity: mergeRecord(previous.identity, identity),
      capabilities: mergeRecord(previous.capabilities, capabilities),
      metadata: mergeRecord(previous.metadata, metadata),
      diagnostics: append(previous.diagnostics, diagnostics),
    }
  },
}
