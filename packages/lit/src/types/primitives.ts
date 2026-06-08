import type { AnyRecord, EmptyRecord, PolymorphicGenerics, VariantMap } from '@praxis-kit/core'
import type { LitElement } from 'lit'

export type PolymorphicElement<G extends PolymorphicGenerics> = HTMLElement &
  G['props'] & {
    readonly as?: G['default']
  }

export type UnknownProps = AnyRecord

/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the class contract without exposing LitElement's private members
 * (which would trigger TS4094 in declaration emit). Variant key instance
 * properties are typed via the TVariants parameter.
 */
export type LitContractComponent<TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>> = {
  new (): LitElement & {
    as: string | undefined
    variantKey: string | undefined
    praxisClass: string | undefined
  } & { [K in Extract<keyof TVariants, string>]?: string | null }
}
