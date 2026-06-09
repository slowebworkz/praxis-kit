import type { AnyRecord } from '../types'

export function mergeProps<T extends AnyRecord, P extends AnyRecord>(
  defaultProps: Partial<T> | undefined,
  props: P,
): Omit<Partial<T>, keyof P> & P {
  return {
    ...(defaultProps ?? {}),
    ...props,
  } as Omit<Partial<T>, keyof P> & P
}
