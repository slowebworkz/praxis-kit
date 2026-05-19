import type { ElementType } from '../types'
import type { ResolveTagFn } from '../types'

export function resolveTag<TDefault, TAs>(defaultTag: TDefault, as?: TAs) {
  return as ?? defaultTag
}

export function makeResolveTag<TDefault extends ElementType>(
  defaultTag: TDefault,
): ResolveTagFn<TDefault> {
  function tag(): TDefault
  function tag<T extends ElementType>(as: T): T
  function tag(as?: ElementType) {
    return resolveTag(defaultTag, as)
  }
  return tag
}
