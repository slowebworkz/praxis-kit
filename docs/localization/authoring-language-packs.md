# Authoring a language pack

A language pack is an npm package that holds one JSON catalog for one locale. Praxis Kit emits
diagnostic **facts** (a code, a severity, a `context` of values); `praxis-kit-diagnostics` turns
them into text from a catalog. This guide is for people writing that catalog, in this repository or
in their own.

> **Coverage is partial.** A pack translates the _catalog-driven_ diagnostics: the ids in the
> contract (`praxis-kit-diagnostics/contract.json`, 54 in contract 1.0). The rest always print as
> their code, whatever pack is installed; the contract's `notCatalogDriven` lists each one with the
> reason. Moving more of them into the catalog is a separate, deliberate task and is a compatible
> addition.

## What a pack depends on

Only the public surface of `praxis-kit-diagnostics`: the package entry, `/contract.json`,
`/schema.json`, `/en.json` (reference only) and the `praxis-kit-diagnostics` command. Never monorepo
paths or workspace aliases. A pack should install and validate from npm with nothing else checked
out.

```jsonc
// package.json of a pack
{
  "name": "praxis-kit-diagnostics-fr",
  "peerDependencies": { "praxis-kit-diagnostics": ">=0.2 <1" },
  "devDependencies": { "praxis-kit-diagnostics": "^0.2.0" },
  "scripts": { "validate": "praxis-kit-diagnostics validate catalog/fr.json --min-coverage 80" },
}
```

## The catalog

```json
{
  "$schema": "./node_modules/praxis-kit-diagnostics/dist/schema.json",
  "contract": 1,
  "locale": "fr",
  "messages": {
    "HTML3003": { "message": "<{tag}> a déjà le rôle implicite « {implicitRole} »." }
  }
}
```

- `contract` is the contract **major** the catalog targets. `builtAgainst` (a string such as
  `"1.0"`) is optional and advisory.
- `locale` is a BCP 47 tag. It selects the plural and list rules (`Intl.PluralRules`,
  `Intl.ListFormat`).
- Each key under `messages` is a message id from the contract. An entry has a `message`, and
  optionally a `rationale` and `suggestions`.

### Templates

`{name}` inserts a context value. Filters change how: `{names|quote|list-or}`.

| Filter      | Applies to          | Result                         |
| ----------- | ------------------- | ------------------------------ |
| `quote`     | identifier, literal | wraps each value in quotes     |
| `list`      | `string[]`          | "a, b, and c" in your language |
| `list-or`   | `string[]`          | "a, b, or c"                   |
| `list-unit` | `string[]`          | "a, b, c" (no conjunction)     |

Plurals pick a form from a numeric context key:
`{ "plural": "count", "one": "{count} enfant", "other": "{count} enfants" }`. `other` is required;
the other forms must exist in your locale's plural rules.

Rules the validator enforces for every field and every plural form:

- Use only context keys the contract lists for that id, and only **required** ones (an absent key
  would print as a literal `{key}`).
- Keep every **essential** key. Leaving out any other key is a warning.
- A filter must match the key's kind (`list*` on a list, `quote` on an identifier or literal).
- Identifiers and literals (tag names, ARIA attributes, code) are copied verbatim, not translated.
- `fix` strings are code, not prose; do not translate them.

## Validate

```sh
npx praxis-kit-diagnostics validate catalog/fr.json --min-coverage 80
npx praxis-kit-diagnostics export-source --format md > translator-sheet.md
```

`export-source` writes what a translator needs for every id: the English source, what the rule
means, the context keys with their kinds, spec links and real examples rendered in English.

| Exit | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| 0    | valid                                                         |
| 1    | structural errors (or obsolete ids with `--fail-on-obsolete`) |
| 2    | valid, but coverage is below `--min-coverage`                 |
| 64   | bad usage, or an unreadable contract or extension file        |

**Structure and completeness are separate.** `errors` say the catalog is wrong and must not be used.
`incomplete` and `coverage` only say how much is translated: an unfinished pack is valid. `--json`
prints the whole report.

The JSON Schema is for editors (structure, autocomplete). The command is the authority: it also
checks placeholders, plurals and ids, which a schema cannot express.

## Versioning

| Change to the contract                          | What happens to an existing pack                                      |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| New id (minor)                                  | still valid; reported `incomplete`; the fallback covers it            |
| Context key removed, renamed or retyped (major) | the resolver ignores the pack and calls `onIssue`; `validate` exits 1 |
| Id deprecated                                   | still renders; reported under `deprecated`                            |
| Id removed                                      | its translation is reported `obsolete`; `--fail-on-obsolete` fails CI |

A pack declares the contract major in the catalog and the supported `praxis-kit-diagnostics` range
in `peerDependencies`. Release it independently of Praxis Kit.

## Fallback

```ts
import en from 'praxis-kit-diagnostics/en'
import fr from 'praxis-kit-diagnostics-fr'

createMessageResolver(fr, { fallback: en, onIssue: console.warn })
```

Lookup order is the pack, then the fallback, then the diagnostic code (printed by core). English is
opt-in, so a French-only bundle contains none. Fallback is per diagnostic, never per field, so a
message is never half French and half English. A pack for another contract major is ignored and
reported through `onIssue`; the resolver never throws.

## Custom rules

Ids of your own (for `enforcement.aria` rules) are declared in an extension contract and passed with
`--extension`; see the package README. They are checked like built-in ids but do not count toward
coverage.

## CI recipe for a pack repository

1. `npm ci`
2. `npx praxis-kit-diagnostics validate catalog/<locale>.json --json` (errors fail the build; gate
   completeness with `--min-coverage`)
3. Run the same on the oldest and the newest `praxis-kit-diagnostics` the pack claims to support.
   The oldest is the lower bound of your `peerDependencies` range (`>=0.2` means `0.2.0`), so the
   matrix names it and installs it over the dev dependency:

   ```yaml
   strategy:
     matrix:
       diagnostics: ['0.2.0', 'latest'] # lower bound of the peer range, and the newest release
   steps:
     - run: npm ci
     - run: npm install --no-save praxis-kit-diagnostics@${{ matrix.diagnostics }}
     - run: npx praxis-kit-diagnostics validate catalog/fr.json --json
   ```

   Raise the lower bound (in `peerDependencies` and the matrix together) when the pack starts
   needing something newer. If a newer contract major exists, `latest` will fail with
   `contract-incompatible`: that is the signal to publish a pack for the new major.

4. Pack, install the tarball into an empty directory, bundle a tiny entry, and check the bundle has
   no English and the tarball has no `en.json`
5. On a tag, publish with provenance

## Review before shipping

A machine-assisted translation is a draft. Mark the package as such until a native or qualified
reviewer has signed off, and agree a glossary (for example _landmark_, _role_, _accessible name_).
