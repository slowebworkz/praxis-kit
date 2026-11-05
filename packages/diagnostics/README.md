# praxis-kit-diagnostics

Optional message catalogs for [Praxis Kit](https://github.com/slowebworkz/praxis-kit) diagnostics.

This is an independently published and versioned npm package that lives in the Praxis Kit monorepo
(`packages/diagnostics`). It has its own version, changelog, tag (`diagnostics-v<version>`) and
publish workflow, but not its own repository: catalogs stay in step with the diagnostic codes they
describe. A locale pack for another language can be published from anywhere.

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

### What a language pack covers

A pack translates the **catalog-driven** diagnostics: the ids listed in the contract
(`praxis-kit-diagnostics/contract.json`). Some Praxis Kit diagnostics are not catalog-driven yet and
always print as their code, whatever pack is installed (`notCatalogDriven` in the contract lists
each one with the reason). So "install a language pack" localizes most, not all, diagnostics.
Widening coverage is a deliberate, separate task: each id that moves into the catalog is a
compatible addition (a minor contract bump), and a pack that lacks it keeps working and reports it
as incomplete.

### The contract

Packs are validated against a versioned **contract**, not against the English catalog: the contract
says, per id, which context keys exist, what kind each is (identifier, number, list…), which are
essential, and how plurals select. A catalog declares the contract major it targets
(`"contract": 1`).

| Change to the contract                          | Effect on an existing pack                                     |
| ----------------------------------------------- | -------------------------------------------------------------- |
| New id (minor)                                  | still valid; reported as incomplete; fallback covers it        |
| Context key removed, renamed or retyped (major) | the resolver ignores the pack; `validate` fails                |
| Id deprecated                                   | still renders; reported under `deprecated`                     |
| Id removed                                      | its translation is reported as obsolete (`--fail-on-obsolete`) |

### Writing a language pack

A pack is a package containing one JSON file, validated with the CLI:

```sh
npx praxis-kit-diagnostics validate catalog/fr.json --min-coverage 80
npx praxis-kit-diagnostics export-source --format md > translator-sheet.md
```

`validate` exits 0 when the catalog is valid, 1 when it has errors, 2 when it is valid but below
`--min-coverage`, 64 for bad usage. Structural validity (`errors`) is kept apart from completeness
(`incomplete`, `coverage`): an unfinished pack is not an invalid one. Every field, and every plural
form within it, may use only the placeholders the contract lists for that id, with a filter that
matches the key's kind, and must keep the essential ones. `--json` prints the full report.

The JSON Schema (`praxis-kit-diagnostics/schema.json`) gives editors structure and autocomplete. The
CLI is the authority: it enforces the same top-level shape and also checks placeholders, plurals and
ids, which a JSON Schema cannot express.

A pack depends only on this package's public entry points (`praxis-kit-diagnostics`,
`/contract.json`, `/schema.json`, and the `praxis-kit-diagnostics` command), never on monorepo paths
or workspace aliases, so it can live in its own repository and validate after a plain `npm install`.

### Fallback

`createMessageResolver(fr, { fallback: en, onIssue })` looks an id up in the pack, then the
fallback, then gives up and lets the core print the code. English is opt-in, so a French-only bundle
contains none. Fallback is per diagnostic, never per field. A pack for another contract major is
ignored and reported through `onIssue`; it never throws.

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

Rule ids and message ids are yours to namespace (`acme.…`: lower-case letters, digits and hyphens in
dot-separated segments; no upper case, no underscores); the built-in ones are Praxis Kit codes and
the ids in the contract.

The contract stays authoritative for built-in ids, so `validate` rejects an id it does not know.
Declare your own in an **extension contract**, a small JSON file, and pass it with `--extension`:

```json
{
  "ids": {
    "acme.no-div-dialog": {
      "context": {
        "tag": {
          "kind": "identifier",
          "required": true,
          "essential": true,
          "description": "The element"
        }
      }
    }
  }
}
```

```sh
npx praxis-kit-diagnostics validate catalog/app.json --extension acme.extension.json
```

A malformed extension file is a configuration error, not a catalog error: the CLI exits 64, and
`checkCatalog(catalog, contract, { extensions })` throws a `RangeError` instead of returning a
report (every other problem with a catalog is reported, never thrown). An `essential` key must also
be `required`.

Extension ids are checked like built-in ones (placeholders, filters, plurals) but do not count
toward coverage. The JSON Schema accepts any well-formed id, so it never rejects an extended catalog
that the CLI accepts with the extension.

## Why not ICU?

The renderer is a small custom format rather than ICU MessageFormat (for example
`intl-messageformat` from FormatJS). That is a deliberate trade:

|                    | This renderer                        | ICU / `intl-messageformat`               |
| ------------------ | ------------------------------------ | ---------------------------------------- |
| Runtime cost       | None; about 100 lines, no dependency | A parser and formatter on every consumer |
| Syntax             | `{name}`, four filters, plurals      | Standard; `select`, nesting, number/date |
| Translator tooling | JSON Schema and `validate` CLI       | Established ICU-aware tools and TMS      |
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
