# plugins/

Build-time and editor tooling integrations. All are private workspaces published as subpath entries
of `praxis-kit`.

| Workspace     | Package                     | Published entry          | Purpose                                                                       |
| ------------- | --------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `eslint/`     | `@praxis-kit/eslint-plugin` | `praxis-kit/eslint`      | ESLint rules for structural patterns, ARIA contracts, variant configuration   |
| `typescript/` | `@praxis-kit/ts-plugin`     | `praxis-kit/ts-plugin`   | Language-service plugin surfacing praxis diagnostics inline in the editor     |
| `vite/`       | `@praxis-kit/vite-plugin`   | `praxis-kit/vite-plugin` | Vite plugins: static composition, design tokens, SSR optimisation, validation |

The layers are deliberately complementary rather than shared: the ESLint rules analyse raw JSX at
author time, the TS plugin works on the type level in the editor, and the runtime contracts validate
the rendered element tree. Each catches what the others structurally cannot.

> `tailwind/` here is an empty leftover directory (only a stray `node_modules`); the Tailwind
> integration lives in [lib/tailwind](../lib/tailwind/).
