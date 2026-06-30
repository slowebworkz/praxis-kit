import type { AnyRecord } from '@praxis-kit/primitive'

export type MaybePromise<T> = T | Promise<T>
export type MetadataMap = AnyRecord
export type NodeId = string
export type PipelineStrategy = 'sequential' | 'parallel'
export type SlotName = string
