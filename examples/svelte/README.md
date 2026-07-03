# @praxis-kit/example-svelte

Svelte example app — Box, Button, and Tabs built with `@praxis-kit/svelte`, with full test coverage
and a Vite dev server. All `examples/*` workspaces implement the same three components so adapter
behavior can be compared one-to-one; see [examples/README.md](../README.md) for what each component
demonstrates.

State via `setContext` / `getContext`. Tests via `@testing-library/svelte`. Svelte's
`createContractComponent` returns a **bundle**, not a component — each sub-component is a `.svelte`
file passing the bundle to `<Polymorphic>`.

```bash
pnpm dev    # Vite dev server
pnpm test   # component tests
```
