---
'praxis-kit': minor
---

`AriaPolicyEngine.evaluate` and `validate` accept an optional `ancestorTags` list (nearest first). When supplied, `<header>` and `<footer>` resolve to `generic` instead of `banner`/`contentinfo` when nested inside `<article>`, `<section>`, `<aside>`, `<main>` or `<nav>`. Without it, behavior is unchanged: they are treated as top-level.
