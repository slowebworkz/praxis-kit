import type { ElementType, IntrinsicProps } from '../primitives'

export type ResolveAriaFn = <P extends IntrinsicProps>(tag: ElementType, props: P) => { props: P }
