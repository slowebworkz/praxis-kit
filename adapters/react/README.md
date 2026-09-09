# @praxis-kit/react

React adapter for praxis-kit — polymorphic components with ARIA contracts, variant composition, and
structural child validation.

Supports React 18 and 19. Both share the same enforcement behavior; the only difference is how refs
are handled internally.

---

## Installation

```bash
pnpm add @praxis-kit/react
```

React is a peer dependency:

```bash
pnpm add react
```

---

## Usage

```ts
import { createContractComponent } from '@praxis-kit/react'

const Button = createContractComponent({
  tag: 'button',
  name: 'Button',
  defaults: { type: 'button' },
  styling: {
    base: 'btn',
    variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } },
    defaults: { size: 'md' },
  },
  enforcement: {
    strict: 'warn',
    aria: [{ rule: 'no-redundant-role' }],
  },
})
```

The returned component is a standard React component. Pass `as` to change the rendered element:

```tsx
<Button as="a" href="/home">
  Home
</Button>
```

Pass `asChild` to merge props onto the single child element instead of rendering a wrapper:

```tsx
<Button asChild>
  <a href="/home">Home</a>
</Button>
```

Pass `render` for full control over the render output:

```tsx
<Button render={(props) => <a {...props} />} />
```

---

## React 18 / legacy import

The root entry targets React 19 (plain `ref` prop). For React 18, import from the `legacy`
sub-entry:

```ts
import { createContractComponent } from '@praxis-kit/react/legacy'
```

Both entries export the same API. The legacy entry wraps components in `forwardRef` internally.

---

## Slot

`Slottable` marks a child as the composition target when `asChild` is active and the component
renders multiple children:

```tsx
<Button asChild>
  <Slottable>
    <a href="/home" />
  </Slottable>
  <Icon />
</Button>
```

Without `Slottable`, the first child receives the merged props.

---

## Exports

| Export                                                                                                                                                       | Description                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `createContractComponent`                                                                                                                                    | Factory: styling + ARIA enforcement + children validation                                                           |
| `defineContractComponent`                                                                                                                                    | Curries a factory's options so multiple call sites share one config                                                 |
| `Slottable`                                                                                                                                                  | Marks the composition target child for `asChild`                                                                    |
| `mergeRefs`                                                                                                                                                  | Utility for combining multiple React refs                                                                           |
| `ReactFactoryOptions` (type)                                                                                                                                 | Factory options with React-specific extensions                                                                      |
| `ContractProps<T, Mode>` (type)                                                                                                                              | A built component's prop contract, recovered from `typeof X` — `Mode` picks the normal / `asChild` / `render` shape |
| `PolymorphicComponent`, `PolymorphicProps`, `PolymorphicWithAsChild`, `PolymorphicWithRender`, `RenderCallbackProps`, `ElementRef`, `SlottableProps` (types) | Component / prop shapes for typing wrappers                                                                         |

Components are fully polymorphic and accept `as`, `asChild`, and `render` props.
