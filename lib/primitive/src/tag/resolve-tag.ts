import type { ElementType } from '../types'

export type ResolveTagFn<TDefault extends ElementType> = <
  T extends ElementType | undefined = undefined,
>(
  as?: T,
) => T extends ElementType ? T : TDefault

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
