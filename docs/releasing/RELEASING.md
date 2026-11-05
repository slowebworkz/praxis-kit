# Releasing `praxis-kit`

The ordered checklist for shipping a version. Two packages publish from this repo: `packages/kit`
(`praxis-kit`, versioned by the steps below and tagged `v<version>`) and `packages/diagnostics`
(`praxis-kit-diagnostics`, the optional message catalogs, versioned independently). Every other
workspace package is private and unversioned. The release gate itself is described in
[`verify-release.md`](./verify-release.md).

## How a release moves

`main` only ever moves at a release, and it is protected: changes reach it **only through a pull
request** with `Build, Typecheck & Test` and `Playwright component tests` green, admins included. No
direct pushes, force pushes or deletion. A repository ruleset also blocks creating, moving and
deleting `v*` tags (repository admins can bypass), because pushing a `v*` tag runs `publish.yml` and
publishes to npm.

```text
feature branches ──► develop ──► release/<version> ──► develop ──► main ──► tag v<version> ──► npm + GitHub release
                  (PRs)       (changeset version)    (PR)      (PR)     (admin)         (publish.yml)
```

## Checklist

1. **Make sure the release is ready.** Every user-facing change on `develop` since the last tag has
   a changeset in `.changeset/*.md` at the right bump. A merge with no changeset isn't ready. A
   pure-chore release takes `pnpm changeset --empty` so the intent is explicit. Anything that
   changes what consumers can install or run (for example `engines.node`) is user-facing: give it a
   changeset, and say so in the notes.
2. **Version.** From `develop`, create `release/<version>` and run `pnpm changeset version`. It
   consumes the changesets and updates `packages/kit/package.json` and `packages/kit/CHANGELOG.md`.
   Only `praxis-kit` is bumped. Review the changelog wording, then commit as
   `chore(release): version praxis-kit <version>`.
3. **PR `release/<version>` → `develop`** and merge it once CI is green.
4. **Run the full gate** on that commit: `pnpm verify:release`. CI already runs it on every PR.
5. **PR `develop` → `main`** and merge it once CI is green. This is the release PR; nothing else
   lands on `main`.
6. **Tag the merge commit** on `main` as `v<version>` and push the tag. (The tag ruleset lets
   repository admins do this.) `publish.yml` then:
   - builds `packages/kit`,
   - fails if the packed `package.json` still contains `catalog:` specifiers,
   - publishes with provenance (`latest`, or `beta` for an `-alpha`/`-beta`/`-rc` version), and
     skips the publish if that version already exists,
   - creates the GitHub release from the matching `## <version>` section of the changelog,
   - then publishes `praxis-kit-diagnostics` if its `package.json` version is not already on npm
     (idempotent, and after the release so a problem with that package can't block `praxis-kit`).
7. **Sync back.** Open a PR `main` → `develop`
   (`chore: merge main back into develop after <version>`) so `develop` contains the release commit
   and tag. Do not delete `develop` when a PR from it merges.
8. **Reassess GitHub Sponsors** (`CLAUDE.md`). Add a dated entry at the end of `DECISIONS.md` with
   the current numbers (stars, forks, external issues and PRs, trailing-month npm downloads) and the
   conclusion, even when it is "not yet".

### `praxis-kit-diagnostics`

It versions independently of `praxis-kit`: give it its own changeset when its catalogs or resolver
change, and `changeset version` bumps it separately. It rides the same tag and workflow, so there is
no second release process. It is pre-1.0 (`0.x`); the catalog format may still change.

The npm token (`NPM_TOKEN`) must be allowed to publish it. The first publish creates a new package
name, which a token scoped to existing packages cannot do, so widen the token (or publish the first
version by hand) before the release that carries it.

## After publishing

- **Verify from the registry, not the local tarball.** In an empty directory:
  `npm i praxis-kit@<version>` plus the peers you want to exercise (`react`, `preact`, `vue`,
  `solid-js`, `lit`, `svelte`, `typescript`, and `@typescript-eslint/utils` for
  `praxis-kit/eslint`), then `import()` every key of the package's `exports` map except
  `./package.json` and `./codemod` (a CLI), and run `npx praxis-codemod --help`. Last run: 1.4.0,
  all 17 entries resolved.
- **Check the release page** shows the right notes and that `latest` points at the new version
  (`npm view praxis-kit dist-tags`).
- Old versions: the `1.1.0`–`7.8.1` line is deprecated (see `npm-deprecate.yml`). Deprecate a
  published version only on purpose; npm can't unpublish after 72 hours.

## Package size

The 1.4.0 tarball is 3.1 MB and unpacks to 16.8 MB across 47 files, with no sourcemaps. One file
accounts for most of it: `dist/codemod/index.js` is 11.9 MB because the codemod bundles `ts-morph`
and its compiler access on purpose (see `packages/kit/tsdown.config.ts`). Every adapter entry is
about 340–350 KB. Check these numbers when a release changes the build; a drop in `dist/codemod` or
a jump in any adapter entry is the thing to look for.

## Known gaps

- **No CI release job yet.** Versioning (step 2) and tagging (step 6) are manual. When the
  Changesets-driven job is ported it must open the version PR instead of pushing, because `main`
  accepts no direct pushes.
- **Git hooks** (`.husky/` pre-commit / pre-push) are not set up; `pnpm check` is the local gate.
