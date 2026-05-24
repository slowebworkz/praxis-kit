export type AnyRecord = Record<string, unknown>

export type ClassName = string

export type DefaultProps<T> = T extends AnyRecord ? Partial<T> : never

export type ElementType = IntrinsicTag | (string & {})

export type IntrinsicTag = keyof HTMLElementTagNameMap
