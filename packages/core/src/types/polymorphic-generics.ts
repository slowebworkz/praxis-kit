export type { PolymorphicGenerics, PresetOf, VariantsOf } from '@praxis-kit/shared/types'

import type { PolymorphicGenerics } from '@praxis-kit/shared/types'

export type DefaultOf<T extends PolymorphicGenerics> = T['default']
export type PropsOf<T extends PolymorphicGenerics> = T['props']
