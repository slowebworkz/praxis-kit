import type { AriaRole } from './aria-role'

export type IntrinsicProps = Record<string, unknown> & { role?: AriaRole }

export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>
