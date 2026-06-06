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
npm install @praxis-ui/react @praxis-ui/core

# Vue 3
npm install @praxis-ui/vue @praxis-ui/core

# Svelte 5
npm install @praxis-ui/svelte @praxis-ui/core

# Solid
npm install @praxis-ui/solid @praxis-ui/core

# Preact
npm install @praxis-ui/preact @praxis-ui/core
```

Optional add-ons:

```bash
npm install @praxis-ui/tailwind    # Tailwind class pipeline
npm install @praxis-ui/vite-plugin # Static analysis and SSR
npm install @praxis-ui/eslint-plugin --save-dev
npm install @praxis-ui/ts-plugin --save-dev
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
@praxis-ui/core
  ├─ @praxis-ui/react
  ├─ @praxis-ui/svelte
  ├─ @praxis-ui/vue
  ├─ @praxis-ui/solid
  ├─ @praxis-ui/preact
  ├─ @praxis-ui/lit
  └─ @praxis-ui/web
```

---

## Packages

| Package                                              | Description                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| [`@praxis-ui/core`](packages/core)                   | Validation engine, class pipeline, ARIA normalizer, factory       |
| [`@praxis-ui/react`](packages/react)                 | React 19+ · `/legacy` sub-path for React 18                       |
| [`@praxis-ui/vue`](packages/vue)                     | Vue 3                                                             |
| [`@praxis-ui/solid`](packages/solid)                 | Solid · client and SSR                                            |
| [`@praxis-ui/preact`](packages/preact)               | Preact                                                            |
| [`@praxis-ui/svelte`](packages/svelte)               | Svelte 5                                                          |
| [`@praxis-ui/lit`](packages/lit)                     | Lit                                                               |
| [`@praxis-ui/web`](packages/web)                     | Vanilla Custom Elements — no framework required                   |
| [`@praxis-ui/tailwind`](packages/tailwind)           | Layout-aware Tailwind class pipeline plugin                       |
| [`@praxis-ui/vite-plugin`](packages/vite-plugin)     | Vite plugins for static composition, SSR, and contract validation |
| [`@praxis-ui/eslint-plugin`](packages/eslint-plugin) | ESLint rules for enforcing Praxis UI patterns                     |
| [`@praxis-ui/ts-plugin`](packages/ts-plugin)         | TypeScript language service plugin with inline diagnostics        |
| [`@praxis-ui/codemod`](packages/codemod)             | Codemods for migrations                                           |
| [`@praxis-ui/playwright`](packages/playwright)       | Playwright CT helpers — ARIA snapshots, axe sweeps, keyboard      |

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
