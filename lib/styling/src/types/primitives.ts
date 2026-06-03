import type { IntrinsicTag } from '@praxis-ui/shared/types'

export type {
  AnyRecord,
  ClassName,
  EmptyRecord,
  NonEmptyArray,
  VariantConditionValue,
} from '@praxis-ui/shared/types'

export type TagMap = Partial<Record<IntrinsicTag | (string & {}), string>>
