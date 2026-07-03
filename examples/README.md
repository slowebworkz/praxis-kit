# examples/

One runnable example app per adapter. Each workspace implements the same three components — Box,
Button, and Tabs — against its adapter, with full test coverage and a Vite dev server, so behavior
can be compared across frameworks one-to-one.

| Workspace | Adapter exercised    | State mechanism                    |
| --------- | -------------------- | ---------------------------------- |
| `react/`  | `@praxis-kit/react`  | `createContext` / `useState`       |
| `preact/` | `@praxis-kit/preact` | `preact/compat` context            |
| `solid/`  | `@praxis-kit/solid`  | `createSignal` + `createContext`   |
| `svelte/` | `@praxis-kit/svelte` | `setContext` / `getContext`        |
| `vue/`    | `@praxis-kit/vue`    | `provide` / `inject`               |
| `lit/`    | `@praxis-kit/lit`    | Reactive controllers / properties  |
| `web/`    | `@praxis-kit/web`    | Custom element state, no framework |

```bash
cd examples/react   # or any other adapter
pnpm dev            # Vite dev server
pnpm test           # component tests
```

What each component demonstrates:

- **Box** — Tailwind layout pipeline (`flex`/`grid` mode switching, variants, presets)
- **Button** — variants, defaults, `variantKey` presets, `filterProps`, polymorphic `as`
- **Tabs** — compound component pattern: ARIA wiring, state/context, children enforcement

The intended division of labor is on display in Tabs: praxis-kit owns tag resolution, classes, ARIA,
and children enforcement; the framework owns active-tab state and show/hide logic. See
[docs/examples.md](../docs/examples.md) for the per-adapter walkthrough.
