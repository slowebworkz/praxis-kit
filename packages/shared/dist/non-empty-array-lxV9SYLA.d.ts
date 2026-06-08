type IntrinsicTag = keyof HTMLElementTagNameMap;

type ElementType = IntrinsicTag | (string & {});

type EmptyRecord = Record<never, never>;

type NonEmptyArray<T> = [T, ...T[]];

export type { ElementType as E, IntrinsicTag as I, NonEmptyArray as N, EmptyRecord as a };
