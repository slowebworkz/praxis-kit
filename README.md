# Praxis Kit

> **Build components that enforce the rules of the web.**

Praxis Kit is a **contract-based UI framework** that turns HTML semantics, ARIA requirements, and
component composition rules into executable contracts.

Instead of relying solely on documentation, conventions, and code review, Praxis lets components
define the rules that govern how they may be composed, rendered, and used—and gives the development
toolchain mechanisms to enforce those rules.

Contracts can be evaluated across the development lifecycle, from editor and build-time analysis to
runtime validation. Framework adapters allow the same contracts to be shared across React, Vue,
Solid, Svelte, Lit, Web Components, and other rendering environments.

---

## Why Praxis?

Modern component libraries solve three important problems:

- styling
- state management
- rendering

Praxis addresses a fourth:

> **correctness.**

A component should know:

- where it is allowed to appear
- which children it requires
- which parents it belongs to
- which HTML elements it may render as
- which ARIA relationships must exist
- which accessibility requirements must be satisfied

These rules become **executable contracts** rather than documentation.

---

## Example

A component hierarchy can express requirements that ordinary type systems cannot:

```tsx
<Tabs>
  <TabsTrigger />
</Tabs>
```

```text
✖ TabsList is required.
✖ TabsPanel is required.
```

Or invalid composition:

```tsx
<Menu>
  <Button />
</Menu>
```

```text
✖ Button cannot be a direct child of Menu.
```

Or an accessibility requirement:

```tsx
<Dialog>
  <DialogContent />
</Dialog>
```

```text
✖ DialogTitle is required.
✖ Accessible name is missing.
```

Praxis validates these structures automatically rather than leaving them as latent bugs.

---

## Contracts

A contract describes the semantic and structural rules of a component.

Contracts may define:

- required children
- forbidden children
- required parents
- permitted descendants
- HTML content-model restrictions
- polymorphic rendering capabilities
- ARIA relationships
- accessibility policies
- custom validation rules

The component becomes **self-describing**: its API defines not only what can be passed to it, but
what constitutes a valid use of the component.

---

## HTML and ARIA as Executable Rules

HTML and ARIA define the semantics and accessibility requirements of the web platform, but those
requirements are often enforced through developer knowledge, documentation, and review.

Praxis encodes selected HTML and ARIA semantic and accessibility rules as executable contracts.

Examples include:

- heading hierarchy
- landmark semantics
- form relationships
- menu ownership
- dialog accessibility
- tab relationships
- list semantics
- sectioning content
- interactive element restrictions

These are **platform rules**, not framework conventions.

---

## Enforcement Across the Toolchain

A Praxis contract is not limited to runtime validation.

Where enough information is available, contracts can be evaluated earlier in the development
lifecycle:

```text
                 Contract
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
      Editor       Build      Runtime
        │           │           │
   diagnostics   validation   validation
                    │
              optimization
```

This allows Praxis to move correctness checks earlier when possible and avoid unnecessary runtime
work when behavior can be determined ahead of time.

The goal is simple:

> **Define the rule once. Enforce it wherever it can be known.**

### Where each rule is enforced

Not every contract can be checked at every stage — some need the full module graph, some need
runtime values. This matrix shows which layer covers which concern:

| Concern                          | Runtime | ESLint                          | TS plugin | Vite plugin          |     Tailwind     |
| -------------------------------- | :-----: | ------------------------------- | :-------: | -------------------- | :--------------: |
| Variant class resolution         |    ✓    | —                               |     —     | ✓ (pre-compute)      |        ✓         |
| Compound variants                |    ✓    | `no-dead-compound`              |     —     | ✓ (prune dead)       |        ✓         |
| Children cardinality             |    ✓    | `valid-cardinality`             |     ✓     | ✓ (`contractPlugin`) |        —         |
| `children` rule config validity  |    ✓    | `valid-children-config`         |     —     | —                    |        —         |
| Enforcement without `strict`     |    ✓    | `no-enforcement-without-strict` |     ✓     | —                    |        —         |
| HTML nesting / content model     |    ✓    | `no-invalid-html-nesting`       |     —     | —                    |        —         |
| Invalid variant `defaults`       |    ✓    | `no-invalid-default`            |     —     | —                    |        —         |
| Redundant / disallowed ARIA role |    ✓    | `no-redundant-role`             |     —     | ✓ (override check)   |        —         |
| ARIA rule pipeline               |    ✓    | (partial)                       |     —     | ✓ (override check)   |        —         |
| Layout-dependent class filtering |    ✓    | —                               |     —     | —                    |        ✓         |
| `asChild` composition            |    ✓    | —                               |     —     | ⚠ experimental       |        —         |
| Static component inlining        |    ✓    | —                               |     —     | ⚠ experimental       |        —         |
| Design-token manifest            |    —    | —                               |     —     | ✓ (`designTokens`)   | ✓ (`layoutKeys`) |

Legend: **✓** implemented · **—** not applicable at this stage · **⚠ experimental** — behind an
opt-in plugin, pending differential tests. The runtime is always the backstop: anything an earlier
stage can't prove statically still runs through it.

---

## Polymorphism as a Foundation

Components are polymorphic because semantics should not depend on implementation details.

A component may render different HTML elements when appropriate, but changing the rendered element
must not bypass its contract.

Rendering flexibility does not mean semantic flexibility.

---

## Framework Neutral

Contracts are independent of rendering frameworks.

The same component contract can be evaluated in:

- React
- Vue
- Solid
- Svelte
- Lit
- Web Components

Framework adapters translate rendering while the underlying contract remains the same.

```text
              Component Contract
                      │
              Core Runtime
                      │
             Framework Adapter
                      │
        ┌─────────────┼─────────────┐
      React          Vue          Solid
        │             │             │
      Svelte          Lit      Web Components
```

---

## Philosophy

TypeScript tells you whether an API is valid.

Praxis tells you whether a UI is valid.

Types guarantee **syntax**.

Contracts guarantee **semantics**.

The goal is not to replace TypeScript, accessibility tooling, documentation, or code review.

The goal is to make correctness **executable**.

---

## Comparison

| Capability                               | Typical Component Libraries | Praxis Kit |
| ---------------------------------------- | --------------------------- | ---------- |
| Type-safe APIs                           | ✅                          | ✅         |
| Polymorphic components                   | Sometimes                   | ✅         |
| Runtime composition validation           | Rare                        | ✅         |
| Required and forbidden child enforcement | Rare                        | ✅         |
| HTML semantic validation                 | ❌                          | ✅         |
| ARIA contract enforcement                | Limited                     | ✅         |
| Executable accessibility rules           | Rare                        | ✅         |
| Framework-neutral contracts              | Rare                        | ✅         |
| Build-time contract enforcement          | Rare                        | ✅         |
| Contract-driven optimization             | Rare                        | ✅         |

---

## Packages

The repository contains:

- Core contract engine
- HTML and ARIA contract libraries
- Framework adapters
- Runtime validator
- Component primitives
- Styling integration
- Tooling and codemods
- ESLint integration
- Build plugins

The repository is organized as a pnpm workspace so the contract system, runtime, adapters, and
development tooling can evolve as a coordinated system.

---

## Vision

Praxis Kit treats components as **semantic contracts rather than render functions**.

A component should not merely describe what it looks like.

It should define what it is allowed to be.

By encoding the rules of HTML, ARIA, and component composition into reusable contracts, Praxis helps
developers build interfaces that are structurally correct, semantically meaningful, and accessible
by default.

**Define correctness once. Enforce it everywhere.**
