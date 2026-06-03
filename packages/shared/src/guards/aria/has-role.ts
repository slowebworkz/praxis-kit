import type { AnyRecord } from '../../types'

type IntrinsicProps = AnyRecord & { role?: string }
type PropsWithRole = Readonly<IntrinsicProps & { role: string }>

export function hasRole(props: IntrinsicProps): props is PropsWithRole {
  return typeof props.role === 'string'
}
