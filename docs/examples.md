# Examples catalog

Each example workspace (`examples/*`) contains Box, Button, and Tabs components for one adapter,
with full test coverage and a Vite dev server.

## Running an example

```bash
# Pick an adapter
cd examples/react      # or vue / preact / solid / svelte

# Start the dev server
pnpm dev

# Run tests
pnpm test
```

## What each example covers

| Component  | Demonstrates                                                                      |
| ---------- | --------------------------------------------------------------------------------- |
| **Box**    | Tailwind layout pipeline (`flex`/`grid` mode switching, variant classes, presets) |
| **Button** | Variants, defaults, presets (`variantKey`), `filterProps`, polymorphic `as`       |
| **Tabs**   | Compound component pattern — ARIA wiring, state/context, children enforcement     |

## Adapter-by-adapter

### React (`examples/react`)

State via `createContext` / `useState`. Tests via `createRoot` + `act`.

```tsx
<Tabs.Root defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <Tabs.Indicator />
  </Tabs.List>
  <Tabs.Content value="profile">…</Tabs.Content>
</Tabs.Root>
```

### Vue (`examples/vue`)

State via `provide` / `inject` (Vue's equivalent of React Context). Tests via `@vue/test-utils`.

The `toComponent()` helper bridges praxis-ui's `PolymorphicComponent` type (Volar new() pattern) to
Vue's `Component` type accepted by `h()`.

### Preact (`examples/preact`)

State via `preact/compat`'s `createContext` / `useContext`. Tests via `@testing-library/preact`.

API is nearly identical to the React example. Component references are aliased to capitalized vars
for JSX compatibility.

### Solid (`examples/solid`)

State via `createSignal` + `createContext`. Tests via `@solidjs/testing-library`.

Solid's reactive context is a getter function (`ctx.value()` instead of `ctx.value`) — enforced by
the `TabsContextValue` type. `createContractComponent` returns a component function directly (unlike
Svelte).

### Svelte (`examples/svelte`)

State via `setContext` / `getContext`. Tests via `@testing-library/svelte`.

Svelte's `createContractComponent` returns a **bundle**, not a component. Each sub-component is a
`.svelte` file that passes the bundle to `<Polymorphic>`. Tab switching tests use `await act()` to
flush Svelte 5's microtask queue after reactive state updates.

## Key finding: ARIA role gap (PR #89)

Writing the Tabs test suite uncovered that `tab`, `tablist`, and `tabpanel` were missing from
`KNOWN_ARIA_ROLES`. The `render.ts` guard `if (isKnownAriaRole(role))` silently dropped all three
roles from the DOM, meaning the Tabs component had no ARIA semantics at runtime despite correct
source code. The fix added all three roles and consolidated the role list to a single source of
truth.

## Benchmark: praxis-ui vs vanilla React

`lib/bench/src/tabs.bench.ts` compares the praxis-ui Tabs against an equivalent hand-rolled React
Tabs with the same DOM structure and ARIA wiring.

Run via:

```bash
cd lib/bench
pnpm bench:render
```

Findings (jsdom, warm LRU cache):

| Scenario               | praxis-ui    | vanilla      | ratio        |
| ---------------------- | ------------ | ------------ | ------------ |
| Initial mount          | ~1,540 ops/s | ~3,100 ops/s | ~2× slower   |
| Re-render (tab switch) | ~1,220 ops/s | ~1,500 ops/s | ~1.2× slower |
| Controlled re-render   | ~1,980 ops/s | ~2,230 ops/s | ~1.1× slower |

The mount cost reflects the class pipeline and ARIA engine running for the first time. Re-render
cost is lower because the LRU cache absorbs repeated class resolution. The overhead is the explicit
price of automatic ARIA enforcement, structural validation, and the variant pipeline.
