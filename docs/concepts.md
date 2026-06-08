# Core concepts

## Polymorphism

Every component created with `createContractComponent` renders any HTML tag via the `as` prop:

```tsx
<Button as="a" href="/dashboard">
  Go to dashboard
</Button>
```

The `as` value changes the rendered element but preserves all variant classes, ARIA processing, and
prop filtering. This is the entry point; the contract layer is the deeper value.

## Contracts

A contract is a structural rule attached to a component at definition time. There are two kinds:

### Children rules

Enforce which child components are valid and how many:

```ts
createContractComponent({
  tag: 'div',
  name: 'TabsList',
  enforcement: {
    strict: 'warn',
    children: [
      { name: 'Tabs.Trigger', match: isType(Trigger), cardinality: { min: 1 } },
      { name: 'Tabs.Indicator', match: isType(Indicator), cardinality: { max: 1 } },
    ],
  },
})
```

Violations surface as warnings (or thrown errors if `strict: 'throw'`) in development and are silent
in production.

### ARIA rules

`@praxis-kit/contract` runs an ARIA policy engine on every render. It:

- Strips `role` attributes that would conflict with an element's implicit ARIA role
- Removes ARIA attributes not valid for the resolved role
- Warns on redundant or impossible combinations

This runs automatically — no per-component configuration required.

## Variants and styling

Variants use the [CVA](https://cva.style) API internally:

```ts
styling: {
  base: 'btn',
  variants: {
    size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
    intent: { primary: 'btn-primary', ghost: 'btn-ghost' },
  },
  defaults: { size: 'md', intent: 'primary' },
  compounds: [{ size: 'lg', intent: 'ghost', class: 'btn-lg-ghost' }],
}
```

Variant class resolution is cached per unique prop combination with an LRU eviction. Warm-path
renders avoid recomputation.

## Presets

Presets are named variant bundles activated via `variantKey`:

```ts
presets: {
  cta: { intent: 'primary', size: 'lg' },
}
```

```tsx
<Button variantKey="cta">Sign up</Button>
```

Presets are merged at render time, not pre-compiled. Explicit props always win over the preset:

```tsx
<Button variantKey="cta" intent="ghost">Override</Button>  {/* ghost wins */}
```

## Tailwind layout pipeline and variant naming

This section applies **only to components using `createTailwindPipeline`** (i.e. components with
`styling.plugin: createTailwindPipeline`). Plain CVA-based components are unaffected.

### How the layout pipeline works

The `@praxis-kit/tailwind` plugin activates a layout mode based on the `flex` and `grid` props:

| Props passed    | Layout mode | What happens                              |
| --------------- | ----------- | ----------------------------------------- |
| neither         | `none`      | All flex/grid utilities stripped          |
| `flex={true}`   | `flex`      | Grid utilities stripped; `flex` prepended |
| `grid={true}`   | `grid`      | Flex utilities stripped; `grid` prepended |
| both (conflict) | `flex` wins | Warning emitted; grid utilities stripped  |

Stripping is **prefix-based** — a class is removed because its name matches a known layout prefix
(`flex-`, `grow`, `shrink`, `basis-`, `grid-`, `col-`, `row-`, `auto-cols-`, `auto-rows-`), not
because it was validated against the Tailwind config. A custom class named `grid-triplets-1` strips
in flex mode even though it is not a real Tailwind utility. This is the accepted design contract.

### Variant naming rules

Because stripping is prefix-based, variant classes that start with these prefixes will be stripped
under a conflicting layout mode. This has two practical consequences:

**1. Don't drive display mode through variants.**

The `flex` and `grid` display classes are reserved emitters for the pipeline. Embedding them in a
variant's class string will produce silent no-ops or stripped output depending on which layout prop
is active:

```ts
// ❌ Don't do this — the pipeline owns display mode, not variants
styling: {
  variants: {
    layout: { row: 'flex flex-row', column: 'flex flex-col' },
  },
}
```

Use the `flex` / `grid` props instead. The pipeline prepends the display class automatically.

**2. Don't name custom classes after layout prefixes if they must survive a mode switch.**

If your design system uses custom utility names that happen to begin with `grid-`, `flex-`, `col-`,
etc., those classes will be stripped under a conflicting layout mode even though they have no
semantic relationship to Tailwind's layout system:

```ts
// ❌ Risky — 'grid-brand-card' is stripped in flex mode
styling: {
  variants: {
    style: { card: 'grid-brand-card rounded-lg' },
  },
}

// ✅ Safe — no layout prefix
styling: {
  variants: {
    style: { card: 'brand-card rounded-lg' },
  },
}
```

This rule applies **only** to components using `createTailwindPipeline`. A component with no layout
plugin has no stripping behavior — variant class names are free.

### Dead-variant detection

With `strict: 'warn'` or higher, the pipeline warns when a variant's **entire** class contribution
is stripped under the active layout mode:

```text
[createTailwindPipeline] Variant "cols=2" contributes only classes stripped under
layout mode "flex" ("grid-cols-2") — it produces nothing in this mode.
```

This fires once per unique message (deduplicated). Use it to catch variants that accidentally
produce nothing in a given layout context.

## filterProps

Props that should never reach the DOM must be declared in `filterProps`. This keeps variant keys and
component-owned props out of the HTML:

```ts
filterProps: (key, variantKeys) => variantKeys.has(key) || key === 'loading'
```

## Strict mode

`enforcement.strict` controls how violations behave:

| Value     | Behaviour                                            |
| --------- | ---------------------------------------------------- |
| `false`   | Silent — no warnings, no throws (production default) |
| `'warn'`  | `console.warn` in development                        |
| `'throw'` | Throws `Error` in development                        |

`warn()`-severity ARIA violations always cap at `console.warn`, even in `'throw'` mode.

## Compound components and context

praxis-kit does not own state or context — that is the framework's job. The Tabs example
demonstrates the intended division:

- **praxis-kit** owns: tag resolution, class pipeline, ARIA roles, children enforcement
- **Framework context** owns: active tab state, show/hide logic

This separation means the contract layer is framework-agnostic and the state layer is idiomatic to
each framework.
