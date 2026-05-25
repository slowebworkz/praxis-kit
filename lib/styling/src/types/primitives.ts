import type { IntrinsicTag } from '@polymorphic-ui/primitive'

export type { AnyRecord, ClassName, EmptyRecord } from '@polymorphic-ui/primitive'

export type NonEmptyArray<T> = [T, ...T[]]

export type TagMap = Partial<Record<IntrinsicTag | (string & {}), string>>

export type VariantConditionValue = string | boolean | ReadonlyArray<string | boolean>
