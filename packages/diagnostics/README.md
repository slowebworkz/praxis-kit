# praxis-kit-diagnostics

Optional message catalogs for [Praxis Kit](https://github.com/slowebworkz/praxis-kit) diagnostics.

Praxis Kit itself emits **diagnostic facts**: a `code` (such as `HTML3004`), a severity and
category, and a `context` of the values involved. It carries no prose. Install this package to turn
those facts into text in your language. Without it, a diagnostic prints as its code.

| You install                             | You see                                                |
| --------------------------------------- | ------------------------------------------------------ |
| `praxis-kit` only                       | `Warning HTML3004`                                     |
| `praxis-kit` + `praxis-kit-diagnostics` | `Warning HTML3004: [HTML] <nav> should not override …` |
| `praxis-kit` + your own resolver        | whatever your function returns                         |

This package has no runtime dependency on `praxis-kit`. A resolver works on any object with a
`code`, an optional `messageId` and an optional `context`.

## Use

```ts
import { createDiagnostics } from 'praxis-kit/contract'
import { createMessageResolver } from 'praxis-kit-diagnostics'
import en from 'praxis-kit-diagnostics/en'

const diagnostics = createDiagnostics('warn', { messages: createMessageResolver(en) })

// Share the instance across components:
createContractComponent({ tag: 'nav', name: 'Nav', enforcement: { diagnostics } })
```

The resolver belongs to that `Diagnostics` instance. Nothing is global, so two instances can report
in different languages at once, which is what makes it safe for server rendering and for apps with
more than one locale in flight.

### Choosing a language keeps English out of your bundle

English lives in its own entry, `praxis-kit-diagnostics/en`. Import only the locale you need and the
English catalog is never part of the build:

```ts
import de from 'praxis-kit-diagnostics-de' // a locale pack: a JSON catalog, no code
```

## Catalog format

One JSON file per locale. The English catalog (`praxis-kit-diagnostics/en.json`) is the reference,
and `praxis-kit-diagnostics/schema.json` is a JSON Schema for editor validation.

```json
{
  "$schema": "…/schema.json",
  "locale": "en",
  "messages": {
    "HTML3003": {
      "message": "<{tag}> already has implicit role=\"{implicitRole}\".",
      "rationale": "…",
      "suggestions": [{ "title": "…", "description": "…", "fix": "aria-live=\"{impliedLive}\"" }]
    },
    "SLOT1003": {
      "message": {
        "plural": "count",
        "one": "{name}: asChild discarded {count} non-element child.",
        "other": "{name}: asChild discarded {count} non-element children."
      }
    }
  }
}
```

- A key is a diagnostic code, or a **message id** several codes (or several shapes of one code)
  share, such as `HTML31xx.attributeIgnored` or `SLOT1002.required`.
- `locale` is a BCP 47 tag. It selects the `Intl.PluralRules` and `Intl.ListFormat` rules. It is
  validated when the resolver is created, not while a diagnostic is being rendered, and it is stored
  exactly as written (`Intl` accepts any casing).
- `{name}` is replaced by that value from the diagnostic's `context`. A name with no value is left
  in place so the mistake is visible.
- Filters follow a pipe and apply left to right: `quote` wraps each item in `"`; `list`, `list-or`
  and `list-unit` join an array using the locale's rules ("a, b, and c", "a, b, or c", "a, b, c").
- A plural is an object keyed by CLDR category (`zero`, `one`, `two`, `few`, `many`, `other`),
  chosen by the numeric context value named in `plural`. `other` is required.
- `suggestions[].fix` is code to copy. Placeholders in it are filled in, but it is not translated.
- `$comment` holds translator notes and is never rendered.
- An id the catalog has no entry for resolves to nothing, and Praxis Kit prints the code. English is
  never substituted.

That is the whole language: placeholders, four filters and plurals. There is no `select`, nesting,
or number and date formatting, on purpose (see [Why not ICU?](#why-not-icu)).

### Writing a locale pack

A locale pack is a package containing one JSON file. Check it against the English catalog:

```ts
import { validateCatalog } from 'praxis-kit-diagnostics'
import en from 'praxis-kit-diagnostics/en'
import de from './de.json'

const issues = validateCatalog(de, en)
if (issues.length > 0) throw new Error(JSON.stringify(issues, null, 2))
```

`validateCatalog` checks the locale tag, that every English id is present and none is invented, that
every field is present, and that **each field, and each plural form within it, uses exactly the
placeholders the English one does**. A variable dropped from one message or one plural branch is
reported even when it appears elsewhere in the entry. A plural form only your language has (Russian
"few") is compared with the English `other` form.

## Custom rules

Built-in Praxis Kit diagnostics are looked up in the catalog by code. Rules you write for
`enforcement.aria` have three options:

1. **Explicit text.** Return `message: '…'`. It is reported as-is through the generic `ARIA2002`
   diagnostic and never touches a catalog. Simple, but not localizable.
2. **Participate in localization.** Return a `diagnostic` with a `messageId` and a `context`, and
   add that id to the catalog you pass to the resolver:

   ```ts
   const rule = ({ tag }) => [
     {
       valid: false,
       fixable: false,
       severity: 'warning',
       diagnostic: {
         code: DiagnosticCode.AriaViolation,
         category: DiagnosticCategory.ARIA,
         messageId: 'acme.no-div-dialog',
         context: { tag },
       },
     },
   ]

   const catalog = {
     ...en,
     messages: {
       ...en.messages,
       'acme.no-div-dialog': { message: '<{tag}> must not be a dialog.' },
     },
   }
   ```

3. **Both.** Supply a `messageId` and let the catalog win; fall back to the code when it has no
   entry.

Rule ids and message ids are yours to namespace (`acme.…`); the built-in ones are Praxis Kit codes
and the `*.…` ids listed in the English catalog.

## Why not ICU?

The renderer is a small custom format rather than ICU MessageFormat (for example
`intl-messageformat` from FormatJS). That is a deliberate trade:

|                    | This renderer                        | ICU / `intl-messageformat`               |
| ------------------ | ------------------------------------ | ---------------------------------------- |
| Runtime cost       | None; about 100 lines, no dependency | A parser and formatter on every consumer |
| Syntax             | `{name}`, four filters, plurals      | Standard; `select`, nesting, number/date |
| Translator tooling | JSON Schema and `validateCatalog`    | Established ICU-aware tools and TMS      |
| Maintenance        | We own the parser semantics          | Mature, widely tested                    |

Diagnostics are short and mostly plain interpolation, the packages they ship in are size-gated, and
the first goal is zero cost for people who never localize. The scope is meant to stay narrow.

**Revisit before this format hardens** if any of these happen: a language needs `select` (gender or
case agreement), messages need number or date formatting, or a professional translation workflow
needs ICU-aware tooling. Until `1.0.0` of this package, the catalog format may still change, so a
move to ICU remains cheap. Messages that are only `{name}` placeholders carry over directly. The
`|filter` syntax and the plural object shape would need converting, and apostrophes need checking,
because ICU treats `'` as an escape character.

## Stability

`0.x`. The catalog format and the resolver API may change before `1.0.0`.
