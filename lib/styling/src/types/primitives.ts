import type { IntrinsicTag } from '@praxis-ui/primitive'

export type { AnyRecord, ClassName, EmptyRecord } from '@praxis-ui/primitive'

export type NonEmptyArray<T> = [T, ...T[]]

export type TagMap = Partial<Record<IntrinsicTag | (string & {}), string>>

export type VariantConditionValue = string | boolean | ReadonlyArray<string | boolean>
