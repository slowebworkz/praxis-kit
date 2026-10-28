# Compound-component root-to-descendant event routing

**Status:** design investigation; no runtime change proposed.

## Question

Should a compound component root accept an event handler intended for one of its named
sub-components and route it to that child?

```tsx
<Card onHeaderClick={handleHeaderClick}>
  <Card.Header>...</Card.Header>
</Card>
```

Today, callers attach the handler to the sub-component directly:

```tsx
<Card>
  <Card.Header onClick={handleHeaderClick}>...</Card.Header>
</Card>
```

The second form works with the current API and requires no praxis-kit-specific event-routing
mechanism.

## Current architecture

`FactoryOptions.subComponents` is a namespace-assembly feature. `assembleCompoundComponent` uses
`Object.assign(root, subComponents)` to expose static properties such as `Card.Header`; it does not
change the root's render behavior. The root renders its ordinary children, and the consumer creates
`Card.Header` as a separate JSX child. Consequently, the root neither instantiates nor owns a direct
reference to the child instance at the point where it renders.

`onElement(element, getProps)` does not provide a routing channel. It is a lifecycle hook for the
component instance whose DOM element it receives. It does not expose child instances or establish
parent/descendant relationships.

## Options considered

### 1. Keep event handlers on the target sub-component — recommended

Continue to let consumers put `onClick` (or another native/framework event prop) on the specific
sub-component that handles it. If a root needs to coordinate multiple parts, use the framework's
own state/context mechanism, which is already the documented division of responsibility for
compound widgets.

**Advantages:** no runtime machinery, no adapter divergence, ordinary framework semantics, and no
ambiguity about which descendant receives a handler. This matches the existing component API.

**Cost:** consumers repeat the handler at the target sub-component rather than declaring it once on
the root.

### 2. Clone or rewrite child elements

A root could inspect its children, identify a `Card.Header` element, and clone it with an injected
handler. This is not a framework-neutral primitive: child representation and transformation APIs
differ across React, Preact, Vue, Solid, Svelte, Lit, and Web. It also introduces questions around
fragments, wrappers, arrays, multiple matching children, render props, and whether user-provided
handlers should be chained or replaced.

This is a poor fit for the current API and adapter matrix.

### 3. Add a parent-to-descendant context channel

The root could publish a handler registry through context and each sub-component could consume its
entry. This handles consumer-placed children without cloning, but it adds an ancestry/communication
abstraction and framework-specific bindings across the adapter set. It also needs explicit
semantics for nested instances, handler precedence, updates, cleanup, and sub-components rendered
outside the root.

This is a substantial public/runtime commitment for a convenience that the current API already
supports by placing the handler on the target component. The earlier ancestry-channel work is
relevant prior art: parent-to-descendant writes have the same cross-adapter maintenance shape as
child-to-parent reads.

### 4. Have the root instantiate its own named parts

If a future compound API makes the root responsible for creating its header/content/footer parts,
root-level handlers can be forwarded at the point those parts are instantiated. That is ordinary
prop forwarding rather than child discovery. However, it is a different compound-component model
from today's consumer-placed JSX children and should not be introduced solely to solve event routing.

## Recommendation

**Do not implement root-to-descendant event routing for the current `subComponents` API.** Treat
`subComponents` as static namespacing only, and keep event handlers on the component that handles
them. Document that the root does not discover or mutate consumer-placed JSX descendants.

Revisit only if a concrete component requires root-owned part instantiation or if multiple real
consumers demonstrate that direct handler placement is insufficient. If that happens, evaluate the
component's state/coordination needs first; use framework context for behavioral state, and avoid a
generic event-forwarding channel unless its semantics and cross-adapter costs are justified.

## Scope and non-goals

- No changes to `FactoryOptions`, `subComponents`, `onElement`, or adapter runtime behavior.
- No implicit `cloneElement`/child traversal.
- No new ancestry/context abstraction.
- No changes to framework-native event propagation or `asChild` handler chaining.
