export interface RefObject<T> {
  current: T | null
}

export type RefCallback<T> = (instance: T | null) => void

export type AnyRef<T> = RefObject<T> | RefCallback<T>
