# @praxis-kit/ts-plugin

TypeScript language service plugin that surfaces praxis-kit diagnostics inline in your editor — no
separate lint step required.

Reports the same structural violations as `@praxis-kit/eslint-plugin` but directly in the TypeScript
compiler output, so they appear in your IDE's Problems panel and in `tsc` output.

---

## Installation

```bash
pnpm add -D @praxis-kit/ts-plugin
```

---

## Configuration

Add the plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@praxis-kit/ts-plugin" }]
  }
}
```

For monorepos or projects that use a custom factory name:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@praxis-kit/ts-plugin",
        "calleeNames": ["createContractComponent", "myCustomFactory"]
      }
    ]
  }
}
```

---

## Diagnostics

| Check                           | Description                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `no-enforcement-without-strict` | `enforcement.aria` or `enforcement.children` present with no `enforcement.strict` — violations will be silently swallowed |
| `valid-cardinality`             | `enforcement.children` cardinality constraints are internally inconsistent                                                |

Diagnostics appear as TypeScript semantic errors on the factory call site. They are visible in VS
Code, WebStorm, and any editor that uses the TypeScript language service.

---

## Note on editor support

TypeScript language service plugins run inside the editor's TypeScript process. They do **not**
affect `tsc --noEmit` run from the CLI unless you pass `--noEmit` with `--generateTrace` or use a
plugin-aware wrapper. For CI enforcement, combine this plugin with `@praxis-kit/eslint-plugin`.
