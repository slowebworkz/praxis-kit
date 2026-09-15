import type { MergeRecords } from '../primitives'
import type { PolymorphicGenerics } from '../variants'
import type { ExtractPluginProps } from '../class'
import type { FactoryOptions } from './factory-options'
import type {
  ContractAllowedOf,
  ContractPluginOf,
  ContractPresetOf,
  ContractPropsOf,
  ContractTagOf,
  ContractVariantsOf,
} from './contract-of'

/**
 * The canonical projection from a defined contract `C` to the `PolymorphicGenerics` shape every
 * adapter's prop types are built from — the one place "G" gets computed, so it can no longer
 * silently drift per adapter the way today's hand-assembled `PolymorphicGenerics<...>` instantiation
 * at each `createContractComponent` call site can (see `ContractGenericsWithAllowedOf` below for
 * the one confirmed instance of that drift).
 *
 * Folds the class-resolution plugin's own contributed props (`ExtractPluginProps<TPlugin>`) into
 * `props` here, once, rather than leaving each adapter's `ContractProps` to re-derive that merge
 * via its own distributive conditional type on every read — the root cause of the ~22-member
 * layout-union bug PR #95 patched per-adapter (see `DECISIONS.md`'s `defineContract` entry).
 */
export type ContractGenericsOf<C extends FactoryOptions> = PolymorphicGenerics<
  ContractTagOf<C>,
  MergeRecords<ContractPropsOf<C>, ExtractPluginProps<ContractPluginOf<C>>>,
  ContractVariantsOf<C>,
  ContractPresetOf<C>
>

/**
 * Same projection as `ContractGenericsOf`, additionally threading `TAllowed` through to
 * `PolymorphicGenerics`'s own `TAllowed` parameter. Only React's `createContractComponent`
 * currently uses this variant — every other adapter uses the plain `ContractGenericsOf` above,
 * matching their current behavior of not narrowing `as` via `enforcement.allowedAs` at the type
 * level (the ARIA/tag-resolution engine still enforces `allowedAs` identically at runtime for all
 * adapters regardless of which projection their types use).
 */
export type ContractGenericsWithAllowedOf<C extends FactoryOptions> = PolymorphicGenerics<
  ContractTagOf<C>,
  MergeRecords<ContractPropsOf<C>, ExtractPluginProps<ContractPluginOf<C>>>,
  ContractVariantsOf<C>,
  ContractPresetOf<C>,
  ContractAllowedOf<C>
>
