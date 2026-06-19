import type { EmptyRecord, StrictMode, VariantMap } from '@praxis-kit/core'

export type UnknownProps = Record<string, unknown>

/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the public contract without exposing HTMLElement's internal members.
 * Variant key instance properties are typed via TVariants.
 */
export type WebContractComponent<TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>> = {
  new (): HTMLElement & {
    as: string | undefined
    recipe: string | undefined
    praxisClass: string | undefined
    /** Re-runs the pipeline — call after setting non-reactive attributes (aria-*, role, data-*). */
    update(): void
  } & { [K in Extract<keyof TVariants, string>]?: string | null }
  /** The resolved strict mode for this component — usable by subclasses for custom enforcement. */
  readonly strict: Exclude<StrictMode, undefined>
}
