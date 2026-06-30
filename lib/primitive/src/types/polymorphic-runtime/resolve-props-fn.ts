import type { Simplify } from 'type-fest'
import type { AnyRecord } from '../primitives'

export type ResolvePropsFn<Props extends AnyRecord> = <P extends Partial<Props>>(
  props: P,
) => Simplify<Omit<Props, keyof P> & P>
