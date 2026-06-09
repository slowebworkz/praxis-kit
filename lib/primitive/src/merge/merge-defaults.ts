import type { AnyRecord } from '../types'

export function mergeDefaults<T extends AnyRecord, P extends AnyRecord>(
  defaults: Partial<T> | undefined,
  props: P,
): Omit<Partial<T>, keyof P> & P {
  return {
    ...(defaults ?? {}),
    ...props,
  } as Omit<Partial<T>, keyof P> & P
}
