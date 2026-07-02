import type { ReadonlyDeep } from 'type-fest'
import type { AriaRole, IntrinsicProps, IntrinsicTag } from '../primitives'

export type AriaContext = {
  readonly tag: IntrinsicTag
  readonly implicitRole: AriaRole | undefined
  readonly effectiveRole: string | undefined
  readonly props: ReadonlyDeep<IntrinsicProps>
}
