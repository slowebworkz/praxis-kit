import type { AnyRecord } from '../types'
import type { Simplify } from 'type-fest'

type MergedProps<T extends AnyRecord, P extends AnyRecord> = Simplify<Omit<Partial<T>, keyof P> & P>

export function mergeProps<T extends AnyRecord, P extends AnyRecord>(
  defaultProps: Partial<T> | undefined,
  props: P,
): MergedProps<T, P> {
  return {
    ...(defaultProps ?? {}),
    ...props,
  } as MergedProps<T, P>
}
