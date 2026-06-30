export type {
  AllowedOf,
  PolymorphicGenerics,
  RecipeOf,
  VariantsOf,
} from '@praxis-kit/primitive/types'

import type { PolymorphicGenerics } from '@praxis-kit/primitive/types'

export type DefaultOf<T extends PolymorphicGenerics> = T['default']
export type PropsOf<T extends PolymorphicGenerics> = T['props']
