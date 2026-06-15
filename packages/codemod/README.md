# @praxis-kit/codemod

Codemods for migrating between praxis-kit versions.

---

## Installation

```bash
pnpm add -D @praxis-kit/codemod
```

Or run directly with `pnpm dlx` without installing:

```bash
pnpm dlx @praxis-kit/codemod --help
```

---

## Migrations

### v3 → v4: single-package distribution

In v4, all adapters and tooling ship as sub-entries of the `praxis-kit` package instead of
individual scoped packages. Run the `migrate` command to convert both import paths and the renamed
factory function in one pass:

```bash
pnpm dlx @praxis-kit/codemod migrate
```

**Before:**

```ts
import { createPolymorphicComponent } from '@praxis-kit/react'
```

**After:**

```ts
import { createContractComponent } from 'praxis-kit/react'
```

Preview changes without writing to disk:

```bash
pnpm dlx @praxis-kit/codemod migrate --dry-run
```

Print each individual change:

```bash
pnpm dlx @praxis-kit/codemod migrate --verbose
```

Scope to a specific file glob:

```bash
pnpm dlx @praxis-kit/codemod migrate --files "src/**/*.{ts,tsx}"
```

Use a tsconfig for richer symbol resolution:

```bash
pnpm dlx @praxis-kit/codemod migrate --tsconfig tsconfig.json
```

---

## Commands

### `migrate` (recommended)

Runs path rewriting and factory rename in a single pass. This is the entry point for v3 → v4
upgrades.

```bash
praxis-codemod migrate [options]
```

### `rename`

Renames a factory function across your codebase. Handles ESM named imports and named re-exports.
Does **not** rename namespace imports (`import * as X`) or CJS destructuring
(`const { fn } = require(...)`).

```bash
praxis-codemod rename --from createPolymorphicComponent --to createContractComponent
```

### `migrate-paths`

Rewrites `@praxis-kit/*` module specifiers to `praxis-kit/*` only — no rename.

```bash
praxis-codemod migrate-paths
```

---

## Options

### `migrate` and `rename`

| Option       | Default                      | Description                                      |
| ------------ | ---------------------------- | ------------------------------------------------ |
| `--from`     | `createPolymorphicComponent` | Factory function name to rename                  |
| `--to`       | `createContractComponent`    | New factory function name                        |
| `--tsconfig` | _(none)_                     | Path to tsconfig.json for richer symbol analysis |

### `migrate` and `migrate-paths`

| Option    | Default                                | Description                       |
| --------- | -------------------------------------- | --------------------------------- |
| `--files` | `**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}` | Glob pattern for files to process |

### All commands

| Option      | Default | Description                                   |
| ----------- | ------- | --------------------------------------------- |
| `--dry-run` | `false` | Preview changes without writing to disk       |
| `--verbose` | `false` | Print each individual change as it is applied |
| `--help`    |         | Show usage                                    |

---

## Known limitations

- **Namespace imports** — `import * as X from '@praxis-kit/react'` is not renamed by the `rename`
  command. Migrate these manually.
- **CJS destructuring** — `const { createPolymorphicComponent } = require('@praxis-kit/react')` is
  not renamed. Migrate these manually.
- **Dynamic re-exports** — `export * from '@praxis-kit/react'` has its path rewritten but the
  re-exported names are not individually renamed (no specifier list to walk).
