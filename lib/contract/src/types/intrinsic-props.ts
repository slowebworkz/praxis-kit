import type { AnyRecord } from '@praxis-ui/shared/types'
import type { AriaRole } from './aria-role'

export type IntrinsicProps = AnyRecord & { role?: AriaRole }
export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>

export { hasRole } from '@praxis-ui/shared/guards/aria'
