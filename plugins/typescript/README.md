# @praxis-kit/typescript-plugin

A **TypeScript language-service plugin** that surfaces praxis-kit contract diagnostics inline in
your editor, as you type.

It plugs into the TypeScript process that your editor runs (`tsserver`) and appends extra
diagnostics to the ones TypeScript already produces — it never replaces or suppresses them.

> **This is an editor tool, not a compiler plugin.** Language-service plugins run inside
> `tsserver`; `tsc` / `tsc --noEmit` on the command line do **not** load them, so these
> diagnostics do **not** appear in a CLI build or block CI. For build- and CI-time enforcement of
> the same contracts, use [`@praxis-kit/eslint-plugin`](../eslint) (and the runtime enforcement
> that ships in each adapter).

---

## Installation

```bash
pnpm add -D @praxis-kit/typescript-plugin
```

## Configuration

Add it to `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "plugins": [{ "name": "@praxis-kit/typescript-plugin" }]
  }
}
```

In VS Code, also select **"Use Workspace Version"** of TypeScript so the editor loads the plugin.

If your components are created through a re-exported or renamed factory, list the call names:

```jsonc
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@praxis-kit/typescript-plugin",
        "calleeNames": ["createContractComponent", "myComponentFactory"]
      }
    ]
  }
}
```

---

## Diagnostics

Only **statically resolvable** `enforcement` object literals are analyzed — a spread, a variable,
or a call expression in place of the literal is left alone (TypeScript's own type checker still
covers those).

| Code    | Level   | What it flags                                                                                     |
| ------- | ------- | ------------------------------------------------------------------------------------------------- |
| `90001` | warning | `enforcement.children` / `enforcement.aria` present with no `enforcement.strict` — adapter defaults vary, so the enforcement behavior is unclear at the call site |
| `90002` | error   | `cardinality.min` is negative                                                                     |
| `90003` | error   | `cardinality.max` is negative                                                                     |
| `90004` | error   | `cardinality.max < cardinality.min` — the rule can never be satisfied                              |

`cardinality: { max: 0 }` is **not** flagged — it is the canonical way to forbid a child type.

Errors vs. warnings follow one rule: an **impossible / self-contradictory** contract is an error; a
**potentially unintended** one is a warning.
