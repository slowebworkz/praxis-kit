import type { AnyRecord, PolymorphicGenerics } from '@praxis-ui/core'

export type PolymorphicElement<G extends PolymorphicGenerics> = HTMLElement &
  G['props'] & {
    readonly as?: G['default']
  }

export type UnknownProps = AnyRecord
