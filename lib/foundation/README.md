# @praxis-kit/foundation

Generic, dependency-free utilities with a hard constraint no other `lib/*` package carries: this
package is safe to import directly from a script run under `node --experimental-strip-types`, not
just through a bundler.

Private workspace. `@praxis-kit/primitive` depends on this package and re-exports its full surface
through its own existing public API — every prior consumer of `iterate`, `StringMap`, `cn`, etc.
from `@praxis-kit/primitive` keeps working unchanged. New code that runs directly under Node (root
`scripts/`, `qa/*` tooling) should import from here instead.

## Why this exists

Extracted from `lib/primitive/src/utils/` while building `qa/metrics`, whose scripts run via
`node --experimental-strip-types scripts/*.ts` rather than through a bundler. Importing `iterate`
from `@praxis-kit/primitive` there crashed with `ERR_UNSUPPORTED_DIR_IMPORT`:
`lib/primitive/src/index.ts` re-exports via directory-style barrels (`export * from './utils'`,
where `./utils` is a directory), which TypeScript's bundler-mode resolution expands to
`./utils/index.ts` automatically but Node's own native ESM loader does not — it requires an exact
file and throws on a bare directory specifier.

This package's `index.ts` is a genuinely flat barrel — every export refers to a sibling file, never
a directory — so it has none of that risk. **Keep it flat.** Adding a subdirectory here reintroduces
the exact problem this package exists to avoid.

Every export below has zero dependency on anything else in `@praxis-kit/primitive` (confirmed before
moving, not assumed) — that's what made each one safe to extract without pulling `lib/primitive`'s
own type vocabulary along with it. See `DECISIONS.md`.

## Exports

| Export                                        | Purpose                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `iterate`, `items`                            | Generic iteration algorithms over `Iterable`s and DOM-style `item(i)` collections. |
| `StringMap<T>`                                | A string-keyed object type, `Record<string, T>`.                                   |
| `assertNever`                                 | Exhaustiveness-check helper for `never`-typed unreachable branches.                |
| `cn`                                          | Class-name join/merge, thin wrapper over `clsx`.                                   |
| `createObservable`, `Observable<T>`           | A minimal `get`/`set`/`subscribe` observable value, diffing on `set`.              |
| `LRUCache<K, V>`                              | A bounded, least-recently-used eviction cache backed by a single `Map`.            |
| `wrapMethodForDetection`, `WrappedMethod<Fn>` | Wraps a native method so calling it also invokes a supplied callback.              |

Development: `pnpm --filter @praxis-kit/foundation test`, `typecheck`, `lint`.
