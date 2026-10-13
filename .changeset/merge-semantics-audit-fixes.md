---
"praxis-kit": patch
---

Fixed a handful of merge-semantics bugs found during an audit of prop/class/style merging:

- `compose.allProps` (Solid): previously excluded `as`/`class`/`recipe` from the props forwarded
  onto `with`, unlike every other adapter's `allProps`, which forwards the full prop set. Solid
  now forwards the same keys as React/Preact/Vue/Svelte.
- The shared `asChild`/slot prop-merge policy only recognized the literal key `className` for
  concatenation — Vue/Solid/Svelte's `class` fell through to "child wins" instead of concatenating.
  Both key names now get the same concat policy, and Solid's now-redundant local `class`-merge
  patch was removed.
- The same merge policy wiped a slot's entire `style` object when the child's `style` was
  explicitly `null`/`undefined` (e.g. from `style={cond ? styleObj : undefined}`), unlike the
  analogous `className: undefined` case, which already degraded gracefully. Both now behave the
  same way.
- The core `defaults`-vs-caller-props merge (`mergeProps` in `@praxis-kit/primitive`, which runs
  on every render of every component) previously let an explicitly `null`/`undefined` caller prop
  silently overwrite a real configured default. It now falls back to the default in that case,
  matching the common real-world case of a prop forwarded through an intermediate spread with no
  value set.
