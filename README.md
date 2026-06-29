# Praxis Kit

> **Build components that enforce the rules of the web.**

Praxis Kit is a **contract-based UI framework** that enforces HTML semantics, ARIA requirements, and
component composition through executable contracts.

Instead of relying on documentation, conventions, or code review, Praxis Kit allows components to
define the rules that govern how they may be composed, rendered, and used. Invalid component
hierarchies become runtime validation errors instead of latent bugs.

Framework adapters allow these same contracts to be shared across React, Vue, Solid, Svelte, Lit,
Web Components, and other rendering environments.

---

## Why Praxis?

Modern component libraries solve three important problems:

- styling
- state management
- rendering

Praxis solves a fourth:

> **correctness.**

A component should know:

- where it is allowed to appear
- which children it requires
- which parents it belongs to
- which HTML elements it may render as
- which ARIA relationships must exist
- which accessibility requirements must be satisfied

These rules become executable contracts rather than documentation.

---

## Example

```tsx
<Tabs>
  <TabsTrigger />
</Tabs>
```

```text
✖ TabsList is required.
✖ TabsPanel is required.
```

Or:

```tsx
<Menu>
  <Button />
</Menu>
```

```text
✖ Button cannot be a direct child of Menu.
```

Or:

```tsx
<Dialog>
  <DialogContent />
</Dialog>
```

```text
✖ DialogTitle is required.
✖ Accessible name is missing.
```

Praxis validates these structures automatically during development.

---

## Contracts

A contract describes the semantic rules of a component.

Contracts may define:

- required children
- forbidden children
- required parents
- permitted descendants
- HTML content model restrictions
- polymorphic rendering capabilities
- ARIA relationships
- accessibility policies
- lifecycle constraints
- custom validation rules

Every component becomes self-describing.

---

## HTML and ARIA as Executable Rules

HTML and ARIA specifications contain thousands of rules that are usually expressed as prose.

Praxis transforms those rules into executable contracts.

Instead of asking developers to remember the HTML specification or ARIA Authoring Practices Guide,
Praxis validates those requirements directly.

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

These are platform rules—not framework conventions.

---

## Polymorphism as a Foundation

Components are polymorphic because semantics should not depend on implementation details.

A component may render different HTML elements when appropriate, but every rendered element must
still satisfy the component's contract.

Rendering flexibility never bypasses semantic correctness.

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

Framework adapters translate rendering. The contract remains the same.

---

## Philosophy

TypeScript tells you whether an API is valid.

Praxis tells you whether a UI is valid.

Types guarantee syntax.

Contracts guarantee semantics.

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

---

## Vision

Praxis Kit treats components as semantic contracts rather than render functions.

A component should not merely describe what it looks like.

It should define what it is allowed to be.

By encoding the rules of HTML, ARIA, and component composition into reusable contracts, Praxis helps
developers build interfaces that are structurally correct, semantically meaningful, and accessible
by default.
