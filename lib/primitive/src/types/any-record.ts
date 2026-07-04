export type StringMap<T = unknown> = Record<string, T>

export type AnyRecord = StringMap<unknown>

export type EmptyRecord = Record<never, never>
