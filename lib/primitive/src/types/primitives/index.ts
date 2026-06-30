import type { AnyRecord, StringMap } from '../any-record'
import type { ElementType } from '../element-type'
import type { IntrinsicTag } from '../intrinsic-tag'
import type { KnownAriaRole } from '../../constants/aria/known-aria-roles'

export type { AnyRecord, StringMap }
export type { ElementType }
export type { IntrinsicTag }
export type { KnownAriaRole }

export type Booleanish = boolean | 'true' | 'false'
export type ClassName = string | string[]
export type EmptyRecord = Record<never, never>
export type NonEmptyArray<T> = [T, ...T[]]
export type Numberish = number | `${number}`
export type Primitive = string | number | boolean

export type AriaRole = KnownAriaRole | (string & {})

export type DefaultProps<T> = T extends AnyRecord ? Partial<T> : never

export type IntrinsicProps = AnyRecord & { role?: AriaRole }

export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>

export type TagMap = Partial<Record<IntrinsicTag | (string & {}), ClassName>>
