# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

`praxis-kit` (`packages/kit`) is the **only published package** — every `@praxis-kit/*` workspace
package is private and bundled into it, so they are all `ignore`d in `config.json`. Add a changeset
for user-facing changes with `pnpm changeset`; it targets `praxis-kit` only.

Releases are cut from `main` (`baseBranch`). The first tag is `v1.0.0` — see `DECISIONS.md`
("Versioning") — which is gated on `packages/kit` having a real build (all adapters + the codemod
ported) and the CI release workflow.
