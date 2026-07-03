# @praxis-kit/adapter-utils

Shared logic used by all framework adapters — everything an adapter needs that isn't
framework-specific rendering. Keeping this layer fat is what keeps the adapters thin: core has
required no changes for any of the seven adapters.

---

## Key modules

| Module                                                                              | Purpose                                                                     |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `build-core-runtime.ts`                                                             | `buildCoreRuntime` — calls `createPolymorphic`, extracts plugin `ownedKeys` |
| `build-engines.ts`                                                                  | Constructs `ChildrenEvaluator` and validators from enforcement options      |
| `build-definition.ts`                                                               | `defineContractComponent` — custom-element registration (lit/web adapters)  |
| `resolve-adapter-common-options.ts`                                                 | Normalizes shared factory options, wires `Diagnostics`                      |
| `apply-aria.ts` / `apply-filter*.ts` / `apply-prop-normalizers.ts` / `apply-ref.ts` | Render-time steps adapters compose in order                                 |
| `slot-validator.ts`                                                                 | `SlotValidator` — `asChild` invariant enforcement                           |
| `testing/`                                                                          | Cross-adapter conformance suites: SSR, hydration, isolation, performance    |

The `testing/` directory is the behavioral contract in executable form — a new adapter should pass
the conformance suite before it is considered complete (see
[ADAPTER_AUTHORING.md](../../ADAPTER_AUTHORING.md)).

Private workspace, bundled into every adapter entry of `praxis-kit`.

Development: `pnpm --filter @praxis-kit/adapter-utils test`, `typecheck`, `lint`.
