import type { AnyRecord } from './any-record'

export type DefaultProps<T> = T extends AnyRecord ? Partial<T> : never
