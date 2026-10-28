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

`as` also accepts a reference to another praxis-kit component, not just a tag-name string:

```tsx
<Button as={Link} href="/dashboard">
  Go to dashboard
</Button>
```

`allowedAs` enumerates components by reference the same way it enumerates tag names — no bypass
semantics, just strict, by-reference matching:

```ts
enforcement: {
  allowedAs: ['a', 'button', Link],
}
```

## `asChild` composition

Where `as` picks from a fixed set of tags, `asChild` lets the consumer supply the rendered element
directly — the contract component merges its own props onto whatever single child it's given,
instead of rendering its own tag:

```tsx
<Tooltip.Trigger asChild>
  <MyButton>Hover me</MyButton>
</Tooltip.Trigger>
```

`as` and `asChild` are mutually exclusive on the same component.

### Prop merging

Each prop on the merged result is resolved by a fixed, per-key policy — the child's own value never
just silently disappears, but it also doesn't blindly win everywhere:

| Prop kind                     | Policy                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Event handlers (`onClick`, …) | Chained — the child's handler runs first, then the contract component's, unless the child's call left `event.defaultPrevented` |
| `className`                   | Concatenated — both classes are kept                                                                                           |
| `style`                       | Shallow-merged — the child's value wins per CSS property                                                                       |
| Everything else               | Child wins — an explicit prop on the child overrides the contract component's own value                                        |

Refs are merged too: zero refs resolves to `null`, one is passed through unchanged, and two or more
are combined into a single callback ref that sets all of them — so `asChild` composes cleanly with a
consumer's own `ref` as well as with nested `asChild` (each level's ref keeps working).

A render-prop (`render={(props) => ...}`) child, where supported, takes precedence over `asChild`.

### Multiple children (`Slottable`)

`asChild` normally requires exactly one element child. Wrapping the real merge target in `Slottable`
allows other plain siblings to pass through untouched alongside it:

```tsx
<Tooltip.Trigger asChild>
  <Slottable>
    <MyButton>Hover me</MyButton>
  </Slottable>
  <Icon />
</Tooltip.Trigger>
```

### Diagnostics

`asChild` reports through the same `enforcement.diagnostics` mode as every other contract check (see
[Diagnostics](#diagnostics)): a missing or multiple children, `as`+`asChild` both set, a
render-function child where one is required, and non-element siblings dropped without a `Slottable`
wrapper.

**Tag-dependent native behavior.** Some components' _behavior_ — not just styling — depends on the
resolved tag being one of `allowedAs`: a `popoverTarget` invoker, for instance, only functions on
button-like elements per the HTML Living Standard. `allowedAs` alone has no effect on `asChild` —
it's specifically designed to bypass `allowedAs` so a consumer can compose onto any element — so
merging such a component's props onto, say, an `<a>` type-checks and renders with no warning, and
the native behavior just silently doesn't work.

A contract author who knows this applies opts in with `enforcement.nativeTagBehavior: true`:

```ts
createContractComponent({
  tag: 'button',
  enforcement: {
    allowedAs: ['button'],
    nativeTagBehavior: true,
  },
})
```

With both `allowedAs` and `nativeTagBehavior` set, `asChild` warns on React, Preact, and Vue (never
blocks — a consumer who genuinely needs a non-allowed element can still proceed) if the resolved
child's tag falls outside `allowedAs` — see **Adapter support** just below for why those three
specifically, and for the cases even they can't catch. Leave `nativeTagBehavior` unset for ordinary
polymorphic components that restrict `allowedAs` for unrelated reasons (semantics, ARIA) with no
tag-dependent native behavior — setting it there would just produce noise.

**Adapter support.** `nativeTagBehavior` is a framework-neutral field — it's accepted and resolved
on every adapter — but the warning it enables is only **implemented on React, Preact, and Vue**:

| Adapter            | `asChild` model                                                                                                                                     | Checks `nativeTagBehavior`?         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| React, Preact, Vue | Clones the merged props onto a real, consumer-supplied child element                                                                                | Yes                                 |
| Solid, Svelte      | Hands resolved props to a caller-authored render callback/snippet, which owns its own output directly — there is no cloned child element to inspect | No — setting the flag has no effect |
| Lit, Web           | No `asChild` at all                                                                                                                                 | N/A                                 |

Solid's and Svelte's `asChild` was never an oversight to extend this to — their render-callback
shape has nothing resembling a resolved child element at the point this check would run, so there is
nothing to inspect. A contract shared across adapters that sets `nativeTagBehavior: true` still gets
the warning on React/Preact/Vue consumers and simply gets no check at all on Solid/Svelte — not a
silent partial implementation, a structural consequence of each adapter's own composition model.

A multi-element `asChild` composition (a `Slottable`-wrapped merge target plus pass-through siblings
— see **Multiple children** above) is still checked correctly on all three: the real merge target is
resolved via the same `extractSlottable` lookup Slot's own downstream clone-merge uses, not skipped
or guessed at.

**Even on the three adapters that do implement it, the check is best-effort.** It's silently skipped
— no warning, regardless of whether a real mismatch exists — when the child's tag can't be
statically resolved at all: a child that is itself a custom component never stamped with
`markComponentTag` (see `isTag`/`getTag` in `praxis-kit/guards`) has no rendered tag knowable
without actually rendering it.

Both cases degrade to "no warning," not a false warning — the check only ever fires on a tag it can
actually resolve.

## `compose`: declarative `asChild` composition

`compose: { with: Component }` on `FactoryOptions` makes a component always render composed
`asChild` into another praxis-kit component, declaratively — no hand-written wrapper needed. The
`with` property is required by the public `ComposeOptions` TypeScript type: `compose: {}` and
`compose: { allProps: true }` are incomplete declarations and should be corrected by supplying a
composition target. The runtime also checks incomplete declarations defensively: a missing `with`
does not activate composition styling, and supplying `allProps` or `defaults` without `with` emits a
construction-time diagnostic. An empty `compose: {}` remains silent at runtime, but is not a
supported typed declaration:

```tsx
const Surface = createContractComponent({ styling: { base: 'surface' } })

const Card = createContractComponent({
  tag: 'article',
  compose: { with: Surface },
  styling: { base: 'card' },
})

<Card>Content</Card>
```

renders exactly as if the consumer had hand-written:

```tsx
<Surface asChild>
  <article className="card">Content</article>
</Surface>
```

All consumer props land on the composing component's own contract exactly as an ordinary call would
— `with` always renders bare, contributing only its own resolved classes/handlers/attributes onto
whatever the composing component renders as, via the same merge policy `asChild` already uses. If
the consumer explicitly passes `asChild` or `render` themselves, that always wins — `compose` only
applies to an otherwise-ordinary call, the same precedence `as` already has over `defaultTag`.

**Adapter support.** `compose` is accepted by every adapter's `FactoryOptions`, but synthesized
natively per adapter rather than through one shared mechanism, matching each adapter's own `asChild`
composition model:

| Adapter            | How `compose` is synthesized                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React, Preact, Vue | Clone-based, same as a hand-written nested `asChild` call — `with` renders with `asChild: true` and this component's own normal output as its single child                  |
| Solid, Svelte      | `with` renders through its own render-callback/snippet `asChild` mode; the synthesized callback merges `with`'s handed-back props onto this component's own resolved output |
| Lit, Web           | No effect — these adapters have no `asChild` concept for `compose` to compose into                                                                                          |

**Styling plugins.** When automatic `compose` is active and either component uses a
`styling.plugin`, Praxis Kit constructs one composition pipeline from the merged styling metadata.
The primary component's plugin factory takes precedence; if it has no plugin, the direct partner's
factory is used. If both specify different factories, Praxis Kit reports `COMP1016` and keeps the
primary factory. It does not combine arbitrary plugin pipelines or cascade plugin selection through
multiple composition levels. The ordinary, non-composed render path continues to use the component's
own styling pipeline.

The selected plugin's owned props participate in combined class resolution even when `allProps` is
false, but those props are reserved for styling and are not forwarded to the host element or child
through ordinary prop forwarding or `compose.defaults`. Explicit consumer `asChild` or custom
`render` still takes precedence over automatic `compose`; the composition-selected plugin applies
only when the automatic composition resolver is active.

Multi-level `compose` chaining (`with` itself also declaring its own `compose.with`) does not
cascade automatically — `with` is always invoked with `asChild: true`, so its own `compose` check
never fires for that invocation. Composing through more than one hop currently requires an explicit
intermediate layer.

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

`subComponents` only attaches named component properties (for example, `Card.Header`) to the root;
it does not make the root discover or forward props to consumer-placed JSX children. Put an event
handler on the sub-component that handles it. The design rationale and alternatives are recorded in
[compound event routing](design/compound-event-routing.md).

This separation means the contract layer is framework-agnostic and the state layer is idiomatic to
each framework.
