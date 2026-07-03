# @praxis-kit/example-preact

Preact example app — Box, Button, and Tabs built with `@praxis-kit/preact`, with full test coverage
and a Vite dev server. All `examples/*` workspaces implement the same three components so adapter
behavior can be compared one-to-one; see [examples/README.md](../README.md) for what each component
demonstrates.

State via `preact/compat`'s `createContext` / `useContext`. Tests via `@testing-library/preact`.
Nearly identical to the React example; component references are aliased to capitalized vars for JSX
compatibility.

```bash
pnpm dev    # Vite dev server
pnpm test   # component tests
```
