# @praxis-kit/bundle-analysis

Bundle composition analysis for the published `praxis-kit` entry points: what each entry actually
contains after bundling, where the bytes come from, and whether internal workspaces leak into
entries that shouldn't carry them.

Run after changing `packages/kit/tsup.config.ts` (entries, `noExternal`, shared chunks) — the
build's own invariants catch declaration duplication, but composition drift shows up here first.
