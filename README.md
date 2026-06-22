# Praxis Kit

**Build components that enforce their own structure.**

Praxis Kit is a framework-neutral component infrastructure framework that validates component
composition, accessibility rules, and rendering contracts at runtime. Instead of allowing invalid UI
structures to render and fail later, Praxis catches them immediately.

```tsx
<Tabs>
  <TabsTrigger />
</Tabs>
```

```text
✖ TabsList required
✖ TabsPanel required
```

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger />
  </TabsList>
  <TabsPanel>Content</TabsPanel>
</Tabs>
```

```text
✔ Valid structure
```

---

## Installation

All adapters and tooling are bundled in the single `praxis-kit` package:

```bash
npm install praxis-kit
```

Then import from the sub-entry for your framework:

```ts
import { createContractComponent } from 'praxis-kit/react' // React 19+
import { createContractComponent } from 'praxis-kit/vue'
import { createContractComponent } from 'praxis-kit/svelte'
import { createContractComponent } from 'praxis-kit/solid'
import { createContractComponent } from 'praxis-kit/preact'
```

Optional tooling sub-entries:

```ts
import plugin from 'praxis-kit/eslint' // ESLint rules
import plugin from 'praxis-kit/vite-plugin' // Vite static analysis
import plugin from 'praxis-kit/tailwind' // Tailwind class pipeline
```

> **Migrating from `@praxis-kit/*`?** Run `pnpm dlx @praxis-kit/codemod migrate` to rewrite import
> paths and the factory rename automatically.

---

## Why Praxis?

Traditional component libraries validate props, types, and accessibility attributes. Praxis
additionally validates:

- required children and parent/child relationships
- component composition contracts
- accessibility policies
- rendering capabilities

…before broken UI reaches production.

---

## What Problems Does It Solve?

### Structural Validation

```tsx
<Dialog>
  <DialogContent />
</Dialog>
```

```text
✖ DialogTrigger missing
```

### Accessibility Enforcement

```tsx
<nav role="navigation" />
```

```text
✖ Redundant role — stripped before it reaches the DOM
```

### Polymorphic Rendering

```tsx
<Button as="a" href="/pricing">
  Pricing
</Button>
```

```html
<a href="/pricing">Pricing</a>
```

### Framework-Neutral Core

Business logic lives outside framework adapters. One engine, five runtimes.

```text
praxis-kit
  ├─ praxis-kit/react
  ├─ praxis-kit/svelte
  ├─ praxis-kit/vue
  ├─ praxis-kit/solid
  ├─ praxis-kit/preact
  ├─ praxis-kit/lit
  └─ praxis-kit/web
```

---

## Packages

| Sub-entry                | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `praxis-kit/react`       | React 19+ · `praxis-kit/react/legacy` for React 18                |
| `praxis-kit/vue`         | Vue 3                                                             |
| `praxis-kit/solid`       | Solid · client and SSR                                            |
| `praxis-kit/preact`      | Preact                                                            |
| `praxis-kit/svelte`      | Svelte 5                                                          |
| `praxis-kit/lit`         | Lit                                                               |
| `praxis-kit/web`         | Vanilla Custom Elements — no framework required                   |
| `praxis-kit/tailwind`    | Layout-aware Tailwind class pipeline plugin                       |
| `praxis-kit/vite-plugin` | Vite plugins for static composition, SSR, and contract validation |
| `praxis-kit/eslint`      | ESLint rules for enforcing Praxis Kit patterns                    |
| `praxis-kit/ts-plugin`   | TypeScript language service plugin with inline diagnostics        |
| `praxis-kit/codemod`     | Codemods for migrations                                           |
| `praxis-kit/playwright`  | Playwright CT helpers — ARIA snapshots, axe sweeps, keyboard      |

---

## vs. Other Tools

|                | Headless Components | Structural Contracts | Runtime Composition Validation | Accessibility Policies | Framework-Neutral Core |
| -------------- | ------------------- | -------------------- | ------------------------------ | ---------------------- | ---------------------- |
| **Praxis Kit** | — rules only        | ✓                    | ✓                              | ✓                      | ✓                      |
| **Radix UI**   | ✓                   | ✗                    | ✗                              | Partial                | ✗ — React only         |
| **Ark UI**     | ✓                   | Partial              | ✗                              | Partial                | Partial                |
| **React Aria** | ✓                   | ✗                    | ✗                              | ✓                      | ✗                      |
| **CVA**        | ✗                   | ✗                    | ✗                              | ✗                      | ✗ — class strings only |

---

## How It Works

Praxis Kit separates component compilation from rendering through two pipelines.

**Definition pipeline** — runs once per component definition, or at build time via the Vite plugin:

```text
Pass → Pass → Pass
           ↓
      MergeStrategy
           ↓
  ComponentDefinition
```

Each **Pass** contributes a partial result — identity, capabilities, accessibility policies,
structural contracts. A **MergeStrategy** accumulates them into a stable **ComponentDefinition**.
The expensive work happens once; the result is reused across every render.

**Runtime pipeline** — runs at render time:

```text
JSX tree
    ↓
TreeContext      ← node topology + slot assignments
RenderContext    ← attributes, styles, listeners, refs

ComponentDefinition + TreeContext + RenderContext
    ↓
    RuntimeContext
    ↓
    Backend<TOutput>
    ↓
    ReactElement / Vue VDOM / etc.
```

The JSX tree is walked to produce two framework-neutral IRs: **TreeContext** (structure) and
**RenderContext** (decoration). These combine with the compiled definition into a **RuntimeContext**
that a framework **Backend** consumes to produce its native output.

The render path is pure IR assembly plus backend delegation — no policy evaluation, no contract
checking. Those costs are paid once at definition time.

---

## Philosophy

TypeScript can tell you that a prop exists. Praxis can tell you that a component hierarchy is valid.

```tsx
<Tabs>
  <p>Hello</p>
</Tabs>
```

TypeScript: `✔ Compiles` — Praxis: `✖ Invalid Tabs structure`

---

## Learn Praxis in 10 Minutes

The [Getting Started guide](GETTING_STARTED.md) walks from a minimal component:

```ts
const Box = createContractComponent({ tag: 'div' })
```

to variants, compound variants, polymorphic rendering, accessibility validation, structural
contracts, slot rendering, and presets.

**[→ Start here](GETTING_STARTED.md)**

---

## License

MIT — see [LICENSE](LICENSE) for details.
