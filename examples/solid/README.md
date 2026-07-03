# @praxis-kit/example-solid

Solid example app — Box, Button, and Tabs built with `@praxis-kit/solid`, with full test coverage
and a Vite dev server. All `examples/*` workspaces implement the same three components so adapter
behavior can be compared one-to-one; see [examples/README.md](../README.md) for what each component
demonstrates.

State via `createSignal` + `createContext`. Tests via `@solidjs/testing-library`. Solid's reactive
context is a getter function (`ctx.value()` instead of `ctx.value`).

```bash
pnpm dev    # Vite dev server
pnpm test   # component tests
```
