import type { AnyRecord } from '@polymorphic-ui/primitive'
import type { AriaRole } from './aria-role'

export type IntrinsicProps = AnyRecord & { role?: AriaRole }

export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>
