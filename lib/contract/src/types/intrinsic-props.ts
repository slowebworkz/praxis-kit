import type { AnyRecord } from '@praxis-ui/primitive'
import type { AriaRole } from './aria-role'

export type IntrinsicProps = AnyRecord & { role?: AriaRole }

export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>

export function hasRole(props: IntrinsicProps): props is PropsWithRole {
  return typeof props.role === 'string'
}
