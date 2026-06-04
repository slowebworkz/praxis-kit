import type { ElementType } from '../types'
import type { ResolveTagFn } from '@praxis-ui/shared/types'

export type { ResolveTagFn }

export function resolveTag<TDefault, TAs>(defaultTag: TDefault, as?: TAs) {
  return as ?? defaultTag
}

export function makeResolveTag<TDefault extends ElementType>(
  defaultTag: TDefault,
): ResolveTagFn<TDefault> {
  return function tag<T extends ElementType | undefined = undefined>(
    as?: T,
  ): T extends ElementType ? T : TDefault {
    return (as ?? defaultTag) as T extends ElementType ? T : TDefault
  }
}
