import type { IntrinsicTag } from '@polymorphic-ui/primitive'

export type { AnyRecord, ClassName } from '@polymorphic-ui/primitive'

export type NonEmptyArray<T> = [T, ...T[]]

export type TagMap = Partial<Record<IntrinsicTag | (string & {}), string>>
