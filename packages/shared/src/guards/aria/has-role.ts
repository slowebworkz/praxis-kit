import type { IntrinsicProps, PropsWithRole } from '../../types'

export function hasRole(props: IntrinsicProps): props is PropsWithRole {
  return typeof props.role === 'string'
}
