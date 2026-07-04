# praxis-kit findings (component-library, praxis-kit 4.0.3)

Notes collected while upgrading `@praxis-components/*` from praxis-kit 4.0.1 → 4.0.3. For the
praxis-kit maintainer — not something the consuming repo can fix on its own.

## 1. `EnforcementOptions.diagnostics` has no public constructor path

`EnforcementOptions<TAllowed>` (in `praxis-kit/contract`) exposes:

```ts
type EnforcementOptions<TAllowed extends ElementType = ElementType> = {
  readonly diagnostics?: Diagnostics
  // ...
}
```

But `Diagnostics` (the class) and the three preset instances — `warnDiagnostics`,
`throwDiagnostics`, `silentDiagnostics` — are only defined in the internal
`dist/_shared/diagnostics.js` module. None of the public subpaths re-export them:

- `praxis-kit/contract` — exports the `Diagnostics` _type_ alias, but not the class or any preset
  instance.
- `praxis-kit/react`, `praxis-kit/react/legacy` — don't reference diagnostics at all in their public
  exports.
- No other subpath in `package.json`'s `exports` map touches diagnostics either.

`Diagnostics` also has private fields (`#reporter`/`#policy`-equivalent), so it's nominally typed —
consumers can't satisfy the `Diagnostics` type with a duck-typed plain object either.

**Effect:** `resolveAdapterCommonOptions` defaults `diagnostics` to `throwDiagnostics` whenever
`enforcement.diagnostics` is omitted. Every component in the consuming repo with
`enforcement.children` rules (`Audio`, `Video`, `Figure`, `Picture`, `Card`) now throws a
`PraxisError` on composition violations instead of warning via `console.warn` — and there is
currently no public way to opt a component into "warn instead of throw" behavior. Previously the
consuming repo used an (undocumented, untyped, silently-ignored) `strict: 'warn'` property that
never actually did anything — the warn behavior it relied on came from whatever praxis-kit 3.1.0's
default enforcement policy was, not from that property.

**Suggested fix:** re-export `Diagnostics` and the three presets from `praxis-kit/contract` (or add
a new `praxis-kit/diagnostics` subpath), so consumers can write:

```ts
import { warnDiagnostics } from 'praxis-kit/contract'

export const audioOptions = {
  // ...
  enforcement: {
    allowedAs: ['audio'],
    diagnostics: warnDiagnostics,
    children: [/* ... */],
  },
} as const satisfies AnyFactoryOptions
```

**Current stopgap in the consuming repo:** accepting throw-by-default on 4.0.3. Once the export gap
is fixed, add `enforcement.diagnostics: warnDiagnostics` to
`packages/core/src/media/{audio,video,figure,picture}/create.ts` and
`packages/core/src/layout/card/create.ts` there to restore warn-only behavior.

## 2. Position/order child rules don't fire

`Picture`'s "image must be last" rule (a position-based child rule) never produces a warning or
throws, on either 3.1.0 or 4.0.3.

Reproduction:

```tsx
render(
  <Picture>
    <Picture.Image src="/photo.jpg" alt="test" />
    <Picture.Source srcSet="/photo.webp" type="image/webp" />
  </Picture>,
)
```

No diagnostic is reported at all — confirmed by spying on `console.warn` (zero calls) and by
asserting the render doesn't throw. This looks like a rule that was never wired up rather than a
regression from the 4.0.1 → 4.0.3 bump, since the behavior is identical on 3.1.0.
