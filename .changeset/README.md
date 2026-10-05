# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

`praxis-kit` (`packages/kit`) is the **only published package** — every `@praxis-kit/*` workspace
package is private and bundled into it, so they are all `ignore`d in `config.json`. Add a changeset
for user-facing changes with `pnpm changeset`; it targets `praxis-kit` only.

Releases are cut from `main` (`baseBranch`): `develop` merges to `main`, a `vX.Y.Z` tag on `main`
fires `.github/workflows/publish.yml`.

**Current published release: `1.0.2`.** **Current stability policy: 1.x** — see
`docs/api-stability.md`. The version history starts at **`v0.1.0`** (first release of this codebase),
then `0.1.1`, then `1.0.2`; `1.0.1` and `1.0.0` were blocked on npm and never shipped. See
`DECISIONS.md` ("Versioning" and "npm version collision").
