import type { IntrinsicProps, PropsWithRole } from '../../types'
import { isString } from '../foundational'

export function hasRole(props: IntrinsicProps): props is PropsWithRole {
  return isString(props.role)
}
