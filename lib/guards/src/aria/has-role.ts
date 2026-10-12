import type { IntrinsicProps, PropsWithRole } from '@praxis-kit/primitive'
import { isString } from '../foundational'

export function hasRole(props: IntrinsicProps): props is PropsWithRole {
  return isString(props.role)
}
