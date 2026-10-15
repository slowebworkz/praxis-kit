# @praxis-kit/compose-props

Resolves a composing component's _effective_ props/variants for `ContractProps<T>` — folding in
`compose.with`'s own contract when `allProps: true` is set — so a component's exported props type
reflects what it actually forwards at runtime, instead of staying blind to everything beyond its own
declared contract.

Private workspace, bundled into whichever `praxis-kit` adapter entries need it.

---

## Why this exists

`compose: { with: Surface, allProps: true }` forwards a composing component's entire props object to
`with` at runtime — `Surface`'s own variants genuinely work through the composing component. But the
documented pattern for a composing component's exported props type,
`PolymorphicProps<ContractGenericsWithAllowedOf<typeof cardContract>>`, only ever reads
`cardContract` itself — nothing in that projection inspects `compose`. See
`docs/design/compose-props-typing.md` for the full design rationale (finding #54 in
`praxis-components`' own findings log) and the type-level spike that validated this approach before
it was implemented here.

The mechanism this package adds reuses what already ships rather than inventing something new:
`compose.with` is itself a built praxis-kit component, carrying its own `__contract`
(`HasContract<C>`, `@praxis-kit/contract-props`) — the same phantom marker every adapter's
`ContractProps<T>` already reads to recover a component's contract from outside the file that built
it. `ContractGenericsWithComposeOf<C>` is a drop-in sibling for `ContractGenericsWithAllowedOf<C>`
(`@praxis-kit/primitive`) that additionally recovers and folds in that composed partner's contract,
resolving transitively through nested composition, and surfacing an incompatible same-named
`'child-wins'`-category prop as a readable `CollisionError<K>` type instead of a silently wrong
merged type.

## Exports

| Export                              | Purpose                                                                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RecoveredContractOf<T>`            | Recovers `T`'s own `__contract`, or `never` for a non-praxis-kit `compose.with` reference.                                                                 |
| `ComposedContractOf<C>`             | `C`'s composed partner's contract, or `never` if `C` doesn't compose, composition isn't `allProps`, or `with` isn't recognizable.                          |
| `ContractGenericsWithComposeOf<C>`  | The `PolymorphicGenerics` a composing component's `ContractProps<T>` actually needs — `C`'s own props/variants with the composed partner's folded in.      |
| `PropMergeCategory`                 | The four merge policies (`'chain' \| 'concat' \| 'shallow-merge' \| 'child-wins'`), mirroring the runtime's `classifyProp` (`lib/adapter-utils/src/slot`). |
| `ClassifyPropKey<K>`                | Type-level classification of a prop key into one of the four categories above.                                                                             |
| `CollisionError<K>`                 | The literal error type a `'child-wins'` key with incompatible types on both sides resolves to, instead of a silently-wrong merged value.                   |
| `MergeComposedProps<Own, Composed>` | The per-key merge itself, dispatched by `ClassifyPropKey`.                                                                                                 |

## Adoption

Each adapter's own `ContractProps<T>` swaps its internal `ContractGenericsOf<C>` (or
`ContractGenericsWithAllowedOf<C>`) read for `ContractGenericsWithComposeOf<C>` — no change to any
adapter's actual callable signature.

- **Wired: React (current and legacy), Preact, Vue, Solid.** Each audited and validated
  independently against real `createContractComponent` components, not assumed to transfer from
  another adapter — see `docs/design/compose-props-typing.md`, section 6.
- **Svelte: confirmed blocked, not merely unverified.** Its extraction path (`GenericsOf<T>`)
  recovers only the already-projected generics, never retains the full contract `compose` lives on,
  in any inferable position — closing this gap needs a runtime-bundle-shape change, not a type-only
  swap. See the design doc's section 6 for the full investigation.
- **Lit, Web: out of scope by design.** `ComposeOptions`'s own doc comment states `compose` has no
  effect on either adapter — neither has an `asChild` concept.

Development: `pnpm --filter @praxis-kit/compose-props test`, `typecheck`, `lint`.

`compose.defaults` optionally supplies composition-scoped defaults to the secondary component named
by `compose.with`. At the `defineContract` boundary, keys and values are checked against the
secondary component's retained public props, including variant props and plugin-contributed props
when available. These values are passed to that component before `compose.allProps` forwards the
composing component's props, so forwarded values take precedence. The defaults do not mutate the
secondary component's contract. Arbitrary external component references have no retained Praxis Kit
contract to validate against, so their defaults cannot receive this contract-based checking.
