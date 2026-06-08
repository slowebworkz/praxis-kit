import { A as AnyRecord } from '../any-record-CarbE-Qh.js';
export { A as AriaRole, I as IntrinsicProps, P as PropsWithRole } from '../props-with-role-C9Qj1cmA.js';
export { b as KnownAriaRole } from '../known-aria-roles-BIF1I0MH.js';
import { I as IntrinsicTag } from '../non-empty-array-lxV9SYLA.js';
export { E as ElementType, a as EmptyRecord, N as NonEmptyArray } from '../non-empty-array-lxV9SYLA.js';

type ClassName = string;

type DefaultProps<T> = T extends AnyRecord ? Partial<T> : never;

type TagMap = Partial<Record<IntrinsicTag | (string & {}), ClassName>>;

export { AnyRecord, type ClassName, type DefaultProps, IntrinsicTag, type TagMap };
