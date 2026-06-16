import type { ElementType, IntrinsicProps } from './primitives'

// Structural interface — matches AriaPolicyEngine.validate without importing the class.
export type AriaEngine = {
  validate: (tag: ElementType, props: IntrinsicProps) => { props: IntrinsicProps }
}
