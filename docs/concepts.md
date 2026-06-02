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

`@praxis-ui/contract` runs an ARIA policy engine on every render. It:

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

praxis-ui does not own state or context — that is the framework's job. The Tabs example demonstrates
the intended division:

- **praxis-ui** owns: tag resolution, class pipeline, ARIA roles, children enforcement
- **Framework context** owns: active tab state, show/hide logic

This separation means the contract layer is framework-agnostic and the state layer is idiomatic to
each framework.
