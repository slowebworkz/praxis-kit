import type { ClassName } from './class-name'
import type { IntrinsicTag } from './intrinsic-tag'

export type TagMap = Partial<Record<IntrinsicTag | (string & {}), ClassName>>
