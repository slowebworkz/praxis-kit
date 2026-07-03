# @praxis-kit/example-vue

Vue example app — Box, Button, and Tabs built with `@praxis-kit/vue`, with full test coverage and a
Vite dev server. All `examples/*` workspaces implement the same three components so adapter behavior
can be compared one-to-one; see [examples/README.md](../README.md) for what each component
demonstrates.

State via `provide` / `inject`. Tests via `@vue/test-utils`. The `toComponent()` helper bridges the
`PolymorphicComponent` type (Volar new() pattern) to Vue's `Component` type accepted by `h()`.

```bash
pnpm dev    # Vite dev server
pnpm test   # component tests
```
