import type { ElementType } from '../primitives'

export type ResolveTagFn<TDefault extends ElementType> = <
  T extends ElementType | undefined = undefined,
>(
  as?: T,
) => T extends ElementType ? T : TDefault
