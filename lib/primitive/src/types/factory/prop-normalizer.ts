import type { AnyRecord, IntrinsicProps } from '../primitives'

export type PropNormalizer = (
  props: Readonly<AnyRecord & IntrinsicProps>,
) => Partial<AnyRecord & IntrinsicProps>
