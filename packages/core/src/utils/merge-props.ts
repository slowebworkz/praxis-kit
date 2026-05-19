import type { AnyRecord } from '../types'

/**
 * Shallow-merges `defaultProps` under caller-supplied `props`.
 * Caller props always win on key conflict.
 */
export function mergeProps<T extends AnyRecord, P extends AnyRecord>(
  defaultProps: Partial<T> | undefined,
  props: P,
): Omit<Partial<T>, keyof P> & P {
  return {
    ...(defaultProps ?? {}),
    ...props,
  } as Omit<Partial<T>, keyof P> & P
}
