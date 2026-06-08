# Praxis UI

**Build components that enforce their own structure.**

Praxis UI is a framework-neutral component infrastructure framework that validates component
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

Pick the adapter for your framework:

```bash
# React
npm install @praxis-kit/react @praxis-kit/core

# Vue 3
npm install @praxis-kit/vue @praxis-kit/core

# Svelte 5
npm install @praxis-kit/svelte @praxis-kit/core

# Solid
npm install @praxis-kit/solid @praxis-kit/core

# Preact
npm install @praxis-kit/preact @praxis-kit/core
```

Optional add-ons:

```bash
npm install @praxis-kit/tailwind    # Tailwind class pipeline
npm install @praxis-kit/vite-plugin # Static analysis and SSR
npm install @praxis-kit/eslint-plugin --save-dev
npm install @praxis-kit/ts-plugin --save-dev
```

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
@praxis-kit/core
  ├─ @praxis-kit/react
  ├─ @praxis-kit/svelte
  ├─ @praxis-kit/vue
  ├─ @praxis-kit/solid
  ├─ @praxis-kit/preact
  ├─ @praxis-kit/lit
  └─ @praxis-kit/web
```

---

## Packages

| Package                                               | Description                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| [`@praxis-kit/core`](packages/core)                   | Validation engine, class pipeline, ARIA normalizer, factory       |
| [`@praxis-kit/react`](packages/react)                 | React 19+ · `/legacy` sub-path for React 18                       |
| [`@praxis-kit/vue`](packages/vue)                     | Vue 3                                                             |
| [`@praxis-kit/solid`](packages/solid)                 | Solid · client and SSR                                            |
| [`@praxis-kit/preact`](packages/preact)               | Preact                                                            |
| [`@praxis-kit/svelte`](packages/svelte)               | Svelte 5                                                          |
| [`@praxis-kit/lit`](packages/lit)                     | Lit                                                               |
| [`@praxis-kit/web`](packages/web)                     | Vanilla Custom Elements — no framework required                   |
| [`@praxis-kit/tailwind`](packages/tailwind)           | Layout-aware Tailwind class pipeline plugin                       |
| [`@praxis-kit/vite-plugin`](packages/vite-plugin)     | Vite plugins for static composition, SSR, and contract validation |
| [`@praxis-kit/eslint-plugin`](packages/eslint-plugin) | ESLint rules for enforcing Praxis UI patterns                     |
| [`@praxis-kit/ts-plugin`](packages/ts-plugin)         | TypeScript language service plugin with inline diagnostics        |
| [`@praxis-kit/codemod`](packages/codemod)             | Codemods for migrations                                           |
| [`@praxis-kit/playwright`](packages/playwright)       | Playwright CT helpers — ARIA snapshots, axe sweeps, keyboard      |

---

## vs. Other Tools

|                | Headless Components | Structural Contracts | Runtime Composition Validation | Accessibility Policies | Framework-Neutral Core |
| -------------- | ------------------- | -------------------- | ------------------------------ | ---------------------- | ---------------------- |
| **Praxis UI**  | — rules only        | ✓                    | ✓                              | ✓                      | ✓                      |
| **Radix UI**   | ✓                   | ✗                    | ✗                              | Partial                | ✗ — React only         |
| **Ark UI**     | ✓                   | Partial              | ✗                              | Partial                | Partial                |
| **React Aria** | ✓                   | ✗                    | ✗                              | ✓                      | ✗                      |
| **CVA**        | ✗                   | ✗                    | ✗                              | ✗                      | ✗ — class strings only |

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
