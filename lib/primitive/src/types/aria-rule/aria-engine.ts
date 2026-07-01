import type { ElementType } from '../element-type'
import type { IntrinsicProps } from '../primitives'

export type AriaEngine = {
  validate: (tag: ElementType, props: IntrinsicProps) => { props: IntrinsicProps }
}
