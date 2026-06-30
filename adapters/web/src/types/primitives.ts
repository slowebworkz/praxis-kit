import type { AnyRecord, EmptyRecord, VariantMap } from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type UnknownProps = Record<string, unknown>

/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the public contract without exposing HTMLElement's internal members.
 * Variant key instance properties are typed via TVariants.
 */
export type WebContractComponent<
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = {
  new (): HTMLElement & {
    as: string | undefined
    recipe: string | undefined
    praxisClass: string | undefined
    /** Re-runs the pipeline — call after setting non-reactive attributes (aria-*, role, data-*). */
    update(): void
  } & { [K in Extract<keyof TVariants, string>]?: string | null } & TPluginProps
  /** The resolved diagnostics for this component — usable by subclasses for custom enforcement. */
  readonly diagnostics: Diagnostics
}
