---
'praxis-kit': patch
---

Two diagnostics no longer put English sentences in their `context`, so a language pack can translate
them correctly.

- `ARIA2013` (invalid attribute value): `context.expected` (a sentence such as `an integer ≥ 1`) is
  gone. A set of allowed values is `context.values: string[]`; a number, an integer, and an integer
  with bounds each use their own message id (`ARIA2013.number`, `.integer`, `.integerMin`,
  `.integerMax`, `.integerRange`) with `min` / `max` in `context`.
- `HTML3007` (invalid child): `context.allowed` is now a list of tags
  (`['<li>', '<script>', '<template>']`) instead of a sentence. The `<a>` content model is
  `HTML3007.phrasing`, and a parent with no simple summary is `HTML3007.unspecified`.

English text is unchanged except that an enum's allowed values now read `"a", "b", or "c"` (they
gain the "or"), matching how booleans and tristates already read.
