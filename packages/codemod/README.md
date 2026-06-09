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

### `createPolymorphicComponent` → `createContractComponent`

Renames all call sites and import bindings from the old factory name to the new one. This was a
breaking change in 3.0.

```bash
pnpm dlx @praxis-kit/codemod
```

With options:

```bash
pnpm dlx @praxis-kit/codemod \
  --from createPolymorphicComponent \
  --to createContractComponent \
  --files "src/**/*.{ts,tsx}"
```

Preview changes without writing to disk:

```bash
pnpm dlx @praxis-kit/codemod --dry-run
```

---

## Options

| Option      | Default                      | Description                             |
| ----------- | ---------------------------- | --------------------------------------- |
| `--from`    | `createPolymorphicComponent` | Factory function name to rename         |
| `--to`      | `createContractComponent`    | New factory function name               |
| `--files`   | `**/*.{ts,tsx}`              | Glob pattern for files to transform     |
| `--dry-run` | `false`                      | Preview changes without writing to disk |
| `--help`    |                              | Show usage                              |
