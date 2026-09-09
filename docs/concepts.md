# Core concepts

## Polymorphism

Every component created with `createContractComponent` can render as a different HTML tag via the
`as` prop (on every adapter except Lit and Web — see [GETTING_STARTED.md](../GETTING_STARTED.md)):

```tsx
<Button as="a" href="/dashboard">
  Go to dashboard
</Button>
```

The `as` value changes the rendered element but preserves all variant classes, ARIA processing, and
prop filtering. This is the entry point; the contract layer is the deeper value.

## Contracts

A contract is a structural rule attached to a component at definition time. There are two kinds.

### Children rules

Enforce which child components are valid and how many:

```ts
createContractComponent({
  tag: 'div',
  name: 'TabsList',
  enforcement: {
    diagnostics: 'warn',
    children: [
      { name: 'Tabs.Trigger', match: isType(Trigger), cardinality: { min: 1 } },
      { name: 'Tabs.Indicator', match: isType(Indicator), cardinality: { max: 1 } },
    ],
  },
})
```

Violations surface as warnings (or thrown errors under `diagnostics: 'throw'`) in development and
are silent under `diagnostics: 'silent'` — the mode component authors typically ship in production.

### ARIA rules

The core ARIA policy engine runs on every render of a component that declares `enforcement` at all.
It:

- Strips `role` attributes that would conflict with an element's implicit ARIA role
- Removes ARIA attributes not valid for the resolved role
- Warns on redundant or impossible combinations

This runs automatically for any component with `enforcement` declared — no separate
`enforcement.aria` configuration is required to get the built-in checks;
`enforcement.aria`/`enforcement.rules` layer _additional_, component-specific rules on top of them.

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

Variant class resolution is cached per unique prop combination with an LRU eviction (1,000 entries).
Warm-path renders avoid recomputation.

## Presets

Presets are named variant bundles, selected via the `recipe` prop:

```ts
presets: {
  cta: { intent: 'primary', size: 'lg' },
}
```

```tsx
<Button recipe="cta">Sign up</Button>
```

Presets are merged at render time, not pre-compiled. Explicit props always win over the preset:

```tsx
<Button recipe="cta" intent="ghost">Override</Button>  {/* ghost wins */}
```

A `recipe` value with no matching entry in `styling.presets` resolves to an empty preset — no
variant contribution, no error at the styling layer — though a development build separately reports
it as an `unknownRecipeKey` diagnostic (see [ARCHITECTURE.md](../ARCHITECTURE.md#debugging)).

## Tailwind layout pipeline and variant naming

This section applies **only to components using `createTailwindPipeline`** (i.e. components with
`styling.plugin: createTailwindPipeline`, imported from `praxis-kit/tailwind`). Plain CVA-based
components are unaffected.

### How the layout pipeline works

Pass any CSS display value as a boolean prop — `flex`, `inline-flex`, `grid`, `inline-grid`,
`block`, `hidden`, and so on — to control an element's layout mode. The pipeline injects the
matching display class and strips utilities that don't apply under it:

| Mode family                      | What gets stripped                             |
| -------------------------------- | ---------------------------------------------- |
| A `flex`-family value is active  | `grid-*` container utilities                   |
| A `grid`-family value is active  | `flex-*` container utilities                   |
| Any other display value, or none | both `flex-*` and `grid-*` container utilities |

Stripping targets **container** properties specifically. Flex/grid _item_ properties (`order`,
`grow`, `shrink`, `basis-*`, `self-*`, `place-self-*`, `justify-self-*`, `col-*`, `row-*`) are never
stripped based on the element's own mode — they describe how the element behaves as a child of _its
parent's_ layout, which this plugin has no visibility into, so they're left alone regardless of what
the element itself is. A handful of properties valid under both families (`justify-*` minus the item
variants, `items-*`, `place-content-*`, `place-items-*`, and a fixed set of shared `content-*`
values) survive whenever either family is active and are stripped only when neither is.

Because the classifier works off class-name patterns rather than validating against your actual
Tailwind config, a custom utility that happens to start with a stripped prefix (`grid-brand-card`,
say) is still stripped under a conflicting mode even though it has no real relationship to
Tailwind's layout system.

### Variant naming rules

**1. Don't drive display mode through variants.**

The display classes are the pipeline's own responsibility, not a variant's. Embedding them in a
variant's class string produces mode-dependent stripped output instead of a stable class:

```ts
// ❌ Don't do this — the pipeline owns display mode, not variants
styling: {
  variants: {
    layout: { row: 'flex flex-row', column: 'flex flex-col' },
  },
}
```

Use a display-mode prop (`flex`, `grid`, …) instead. The pipeline prepends the display class
automatically.

**2. Don't name custom classes after a stripped container prefix if they must survive a mode
switch.**

```ts
// ❌ Risky — 'grid-brand-card' is stripped whenever flex mode is active
styling: {
  variants: {
    style: { card: 'grid-brand-card rounded-lg' },
  },
}

// ✅ Safe — no layout-family prefix
styling: {
  variants: {
    style: { card: 'brand-card rounded-lg' },
  },
}
```

This rule applies **only** to components using `createTailwindPipeline`. A component with no layout
plugin has no stripping behavior — variant class names are free.

### Dead-variant and void-tag diagnostics

The pipeline reports two development-time conditions through the same `Diagnostics` instance the
component resolved (`enforcement.diagnostics`): a variant whose entire class contribution is
stripped under the active mode, and a layout-mode prop passed to a void element (`img`, `input`,
`br`, …) that can't have the children the mode would apply to. Both fire once per unique message.

## `filterProps`

Props that should never reach the DOM must be declared in `filterProps`. This keeps variant keys and
component-owned props out of the HTML:

```ts
filterProps: (key, variantKeys) => variantKeys.has(key) || key === 'loading'
```

## Diagnostics

`enforcement.diagnostics` controls how contract violations behave. It accepts a preset name or a
full `Diagnostics` instance for custom reporting:

| Value      | Behaviour                                                                    |
| ---------- | ---------------------------------------------------------------------------- |
| `'silent'` | Fixed silently — no warnings, no throws                                      |
| `'warn'`   | `console.warn` on every violation                                            |
| `'throw'`  | `console.warn` on warning-severity violations; throws on error-severity ones |

`'warning'`-severity ARIA violations always cap at `console.warn`, even under `'throw'` — only
`'error'`-severity violations can throw. Omit `enforcement` entirely to skip contract validation at
zero runtime cost — there is no equivalent of a `false` value; the field is simply absent.

## Compound components and context

praxis-kit does not own state or context — that is the framework's job. A Tabs-style compound
component demonstrates the intended division:

- **praxis-kit** owns: tag resolution, class pipeline, ARIA roles, children enforcement
- **Framework context** owns: active tab state, show/hide logic

This separation means the contract layer is framework-agnostic and the state layer is idiomatic to
each framework.
