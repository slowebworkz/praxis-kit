# @praxis-kit/contract

The contract runtime — where "components that enforce the rules of the web" is implemented. Three
engines, all built on `StrictBase` severity routing:

| Engine              | Source          | Enforces                                                                          |
| ------------------- | --------------- | --------------------------------------------------------------------------------- |
| `AriaPolicyEngine`  | `src/aria/`     | Implicit-role conflicts, redundant roles, invalid `aria-*` attributes             |
| `ChildrenEvaluator` | `src/children/` | Structural child rules: match, cardinality, position, ambiguity                   |
| Strict mode         | `src/strict/`   | `false` → silent, `'warn'` → console, `'throw'` → error, via `violate()`/`warn()` |

`src/diagnostics/` holds the contract-specific diagnostic definitions (ARIA, HTML, slot, contract
codes) reported through `@praxis-kit/diagnostics`. `src/props/` and `src/types/` carry the state
contracts and child-rule types surfaced publicly via `praxis-kit/contract`.

Private workspace, consumed by `packages/core` and every adapter. The full evaluation flow (snapshot
diagnostic model, fix deduplication, match matrix) is documented in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

Development: `pnpm --filter @praxis-kit/contract test`, `typecheck`, `lint`.
