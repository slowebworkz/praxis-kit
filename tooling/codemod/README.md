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

Each subsection below is a migration that has **already shipped** — a change already made to the
public API, with a `praxis-codemod` command that applies it mechanically. There is currently one; a
change that would require semantic judgement (see [Known limitations](#known-limitations)) stays a
manual step instead of getting a section here.

### `@praxis-kit/*` → `praxis-kit` (v1.0.0)

In v1, all adapters and tooling moved from individual scoped packages (`@praxis-kit/react`, etc.) to
sub-entries of a single `praxis-kit` package. The factory function was also renamed from
`createPolymorphicComponent` to `createContractComponent`. Run the `migrate` command to handle both
in one pass:

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

### A note on `styling.presets` and the `recipe` prop

An earlier draft of this README documented a second migration here — `styling.presets` →
`styling.recipes`, alongside a `variantKey` prop → `recipe` prop rename, both attributed to "v3".
The prop rename is real and long since complete: `recipe` (not `variantKey`) is the only prop this
repo's factories have ever accepted. **The field rename never shipped** — `StylingOptions.presets`
is the current, correct field name; `recipes` is not a recognized key. Do not rename it — a codemod
that did would break working code. See `DECISIONS.md` → "Open" for the naming-consistency question
this leaves open (the field is still called `presets` even though its type is `RecipeMap` and the
prop that selects from it is `recipe`). If a `presets` → `recipes` field rename ever ships, it gets
a `praxis-codemod` command like the migration above, not a manual step.

---

## Commands

### `migrate` (recommended)

Runs path rewriting and factory rename in a single pass. This is the entry point for upgrading from
`@praxis-kit/*` scoped packages to `praxis-kit`.

```bash
praxis-codemod migrate [options]
```

### `rename`

Renames a Praxis Kit factory across your project — not an arbitrary symbol rename. Only a name
**imported or re-exported from a `@praxis-kit/*` or `praxis-kit/*` specifier** is touched; an
identically-named symbol from anywhere else is left alone. When the import isn't aliased, this also
updates every other reference to that binding in the project (a bare reference, a `.method()` call,
…) — it's a real identifier rename via `ts-morph`, not a text search over the import line. An
aliased import (`import { createPolymorphicComponent as poly }`) only renames the original name at
the import site; `poly` and its call sites are untouched, since the alias — not the original name —
is what the rest of the file actually uses.

Handles ESM named imports and named re-exports. Does **not** rename namespace imports
(`import * as X`) or CJS destructuring (`const { fn } = require(...)`).

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
- **Property / prop renames** — object key renames and JSX attribute renames aren't supported by any
  command here yet (see the [`styling.presets` note](#a-note-on-stylingpresets-and-the-recipe-prop)
  above — there isn't currently one that needs doing). If one ships, migrate it manually until this
  tool grows a structural (AST-based, not find-and-replace) command for it.
