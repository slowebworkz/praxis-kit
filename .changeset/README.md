# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

`praxis-kit` (`packages/kit`) is the **only published package** — every `@praxis-kit/*` workspace
package is private and bundled into it, so they are all `ignore`d in `config.json`. Add a changeset
for user-facing changes with `pnpm changeset`; it targets `praxis-kit` only.

Releases are cut from `main` (`baseBranch`): `develop` merges to `main`, a `vX.Y.Z` tag on `main`
fires `.github/workflows/publish.yml`. The first release is **`v0.1.0`** — see `DECISIONS.md`
("Versioning"). `0.x` signals that surfaces outside the frozen `createContractComponent` /
`FactoryOptions` contract may still move (`docs/api-stability.md`).
