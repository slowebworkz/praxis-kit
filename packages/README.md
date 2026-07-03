# packages/

Publishable composition layers. Unlike [lib/](../lib/) (implementation modules) and
[adapters/](../adapters/) (framework bindings), the workspaces here assemble those pieces into
consumable packages.

| Workspace | Package            | Published? | Purpose                                                                                        |
| --------- | ------------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `core/`   | `@praxis-kit/core` | private    | Framework-neutral capability-driven factory (`createPolymorphic`) composing the `lib/` modules |
| `kit/`    | `praxis-kit`       | **npm**    | The single published package: bundles every adapter, tool, and plugin behind subpath exports   |

`praxis-kit` is the only artifact users install. Its build (see
[kit/tsup.config.ts](kit/tsup.config.ts)) bundles the private workspaces into self-contained entry
points — `praxis-kit/react`, `praxis-kit/tailwind`, `praxis-kit/contract`, and so on — so no
`@praxis-kit/*` name ever appears in a consumer's `node_modules`.

`@praxis-kit/core` stays private: its API reaches users through the adapters and through the
`praxis-kit/contract` entry.
