import type { ElementType } from '@praxis-kit/primitive/types'
import type { IntrinsicProps } from '@praxis-kit/primitive/types/primitives'

// Structural interface — matches AriaPolicyEngine.validate without importing the class.
export type AriaEngine = {
  validate: (tag: ElementType, props: IntrinsicProps) => { props: IntrinsicProps }
}
