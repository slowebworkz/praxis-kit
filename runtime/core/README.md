# @praxis-kit/runtime

Backend-agnostic render runtime — praxis-kit's own rendering machinery for environments that don't
bring a framework. Where an adapter binds contracts into React/Vue/etc. render cycles, this package
renders contract components directly: it powers the vanilla `web` adapter, custom-element
definition, SSR string rendering, and the compiler work in `plugins/vite`.

---

## Key modules

| Module                    | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `build-render-context.ts` | Per-render context: resolved tag, props, classes, diagnostics    |
| `build-tree-context.ts`   | Tree-level context for parent/child contract evaluation          |
| `apply-attributes.ts`     | Writes resolved props/ARIA onto real DOM elements                |
| `component-definition.*`  | Component definition model consumed by `defineContractComponent` |
| `get-active-props.ts`     | State-contract prop activation                                   |
| `compiler/`               | Compile-time evaluation support used by the Vite plugin          |

Private workspace. Bundled into `praxis-kit` entries that need it (web, lit, vite-plugin).

Development: `pnpm --filter @praxis-kit/runtime test`, `typecheck`, `lint`.
