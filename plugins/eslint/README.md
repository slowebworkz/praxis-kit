# @praxis-kit/eslint-plugin

ESLint rules for enforcing praxis-kit structural patterns, ARIA contracts, and variant configuration
at lint time.

---

## Installation

```bash
pnpm add -D @praxis-kit/eslint-plugin
```

---

## Configuration

Add the recommended config to your `eslint.config.ts`:

```ts
import praxisKit from '@praxis-kit/eslint-plugin'

export default [
  praxisKit.configs.recommended,
  // ...
]
```

Or enable rules individually:

```ts
import praxisKit from '@praxis-kit/eslint-plugin'

export default [
  {
    plugins: { '@praxis-kit': praxisKit.plugin },
    rules: {
      '@praxis-kit/no-dead-compound': 'error',
      '@praxis-kit/valid-cardinality': 'error',
    },
  },
]
```

---

## Rules

| Rule                            | Default severity | Description                                                                                                            |
| ------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `no-dead-compound`              | error            | Compound variant entries whose conditions can never match are flagged as dead code                                     |
| `no-enforcement-without-strict` | error            | `enforcement.aria` or `enforcement.children` with no `enforcement.strict` is always silent — likely a misconfiguration |
| `no-invalid-default`            | error            | Variant defaults must reference a key that exists in `styling.variants`                                                |
| `no-invalid-html-nesting`       | error            | Flags structurally invalid HTML nesting (e.g. `<button>` inside `<a>`) that the polymorphic `as` prop could introduce  |
| `no-redundant-role`             | warn             | Explicit `role` attribute that duplicates the element's implicit ARIA role                                             |
| `valid-cardinality`             | error            | `enforcement.children` cardinality constraints must be internally consistent (e.g. `min` ≤ `max`)                      |
| `valid-children-config`         | error            | `enforcement.children` entries must have valid structure                                                               |

All rules in the recommended config run on `createContractComponent` call sites.
