/**
 * Framework-neutral contract-authoring API.
 *
 * This entry point assembles the contract-authoring surfaces from the internal
 * Praxis Kit packages into the public `praxis-kit/contract` API. Every export
 * below is a pass-through to a purpose-named entry of a lower package, where the
 * substance is documented.
 */

/**
 * Structural diagnostics API for consumers authoring custom plugins — the
 * interface a plugin types against, not the internal `Diagnostics` class.
 */
export type { Diagnostics } from '@praxis-kit/core/contract'

/**
 * State-prop normalizers for the built-in component states: `disabled`,
 * `expanded`, `invalid`, `loading`, `pressed`, `readonly`, `selected`, `active`.
 */
export * from '@praxis-kit/core/props'

/**
 * Factory-authoring types for defining framework-neutral components and their
 * contracts: `FactoryOptions`, `AnyFactoryOptions`, `EnforcementOptions`,
 * `StylingOptions`, `NormalizeFn`, `PropNormalizer`, `ResolvedFactoryOptions`.
 */
export type * from '@praxis-kit/primitive/types/factory'

/** Props supported by intrinsic HTML elements. */
export type { IntrinsicProps } from '@praxis-kit/primitive/types'

/**
 * The eight built-in state contracts (`disabledContract`, …) and `mergeContracts`.
 */
export * from '@praxis-kit/core/state'

/**
 * ARIA-rule authoring surface: the fix factories plus the rule / result types.
 */
export * from '@praxis-kit/core/aria'
