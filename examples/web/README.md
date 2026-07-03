# @praxis-kit/example-web

Web (vanilla Custom Elements) example app — Box, Button, and Tabs built with `@praxis-kit/web`, with
full test coverage and a Vite dev server. All `examples/*` workspaces implement the same three
components so adapter behavior can be compared one-to-one; see [examples/README.md](../README.md)
for what each component demonstrates.

No framework — state lives on the custom elements themselves, rendered by `@praxis-kit/runtime`.
Demonstrates the zero-dependency path.

```bash
pnpm dev    # Vite dev server
pnpm test   # component tests
```
