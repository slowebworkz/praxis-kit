# runtime/

Runtime engine workspaces.

| Workspace | Package               | Purpose                                                                                                              |
| --------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `core/`   | `@praxis-kit/runtime` | Backend-agnostic render runtime: render/tree context, attribute application, component definitions, compiler support |

`@praxis-kit/runtime` sits below the framework adapters: where an adapter binds contracts to an
existing framework's render cycle, the runtime provides praxis-kit's own rendering machinery for
environments that don't bring a framework (the vanilla `web` adapter, SSR paths, and the compiler
work in `plugins/vite`).

Private workspace — bundled into `praxis-kit` entries that need it, never published standalone.
