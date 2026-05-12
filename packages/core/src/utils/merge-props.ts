import type { AnyRecord } from '../types'

export function mergeProps<T extends AnyRecord, P extends AnyRecord>(
  defaultProps: Partial<T> | undefined,
  props: P,
): Partial<T> & P {
  return {
    ...(defaultProps ?? {}),
    ...props,
  } as Partial<T> & P
}
