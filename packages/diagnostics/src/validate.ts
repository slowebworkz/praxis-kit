import { isDefined, isString, isUndefined, iterate } from '@praxis-kit/foundation'
import { assertValidLocale } from './resolver'
import { checkCatalog } from './check'
import type { Report } from './check'
import type { DiagnosticsContract } from './contract'
import type { MessageCatalog, MessageEntry, MessageTemplate } from './types'

export type CatalogIssue =
  | { kind: 'invalid-locale'; message: string }
  | { kind: 'missing-id'; id: string }
  | { kind: 'unknown-id'; id: string }
  /** A field, or one plural form of it, is blank, so it would render as empty text. */
  | { kind: 'empty-message'; id: string; field: string; form?: string }
  /** A plural template has no `other` form, which is the fallback for every count it doesn't name. */
  | { kind: 'missing-other-form'; id: string; field: string }
  /** The reference has this field (`rationale`, `suggestions.0.title`, …) and the catalog does not. */
  | { kind: 'missing-field'; id: string; field: string }
  /** The catalog has a field the reference does not. */
  | { kind: 'unknown-field'; id: string; field: string }
  /** A plural template selects on a different count than the reference does. */
  | {
      kind: 'plural-selector-mismatch'
      id: string
      field: string
      expected: string
      actual: string
    }
  /** One field, or one plural form of it, drops or renames a placeholder. */
  | {
      kind: 'placeholder-mismatch'
      id: string
      field: string
      form?: string
      missing: string[]
      extra: string[]
    }

const TOKEN = /\{([A-Za-z_$][\w$]*)(?:\|[a-z-]+)*\}/g

/** Every `{name}` a single template string uses; filters are ignored. */
export function placeholdersIn(text: string): Set<string> {
  return new Set([...text.matchAll(TOKEN)].map((match) => match[1] as string))
}

/** Each translatable field of an entry, keyed by a path such as `message` or `suggestions.1.title`. */
function fieldsOf(entry: MessageEntry): Map<string, MessageTemplate> {
  const fields = new Map<string, MessageTemplate>([['message', entry.message]])
  if (isDefined(entry.rationale)) fields.set('rationale', entry.rationale)
  entry.suggestions?.forEach((suggestion, index) => {
    fields.set(`suggestions.${index}.title`, suggestion.title)
    if (isDefined(suggestion.description)) {
      fields.set(`suggestions.${index}.description`, suggestion.description)
    }
    if (isDefined(suggestion.fix)) fields.set(`suggestions.${index}.fix`, suggestion.fix)
  })
  return fields
}

type Forms = Map<string | undefined, string>

/** A template's text by plural form; a plain string is the single form `undefined`. */
function formsOf(template: MessageTemplate): Forms {
  if (isString(template)) return new Map([[undefined, template]])
  const { plural: _selector, ...rest } = template
  const forms: Forms = new Map()
  iterate.forEachEntry(rest, (form, text) => {
    if (isString(text)) forms.set(form, text)
  })
  return forms
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((name) => b.has(name))
}

/**
 * The placeholders a translated form must use. A form the reference also has is compared with that
 * form; a form only this locale has (Russian "few", Arabic "zero") or a plain string compared with a
 * plural reference is compared with the reference's `other` form, the general case.
 */
function expectedFor(reference: Forms, form: string | undefined): Set<string> | undefined {
  const text = reference.get(form) ?? reference.get('other') ?? reference.get(undefined)
  return isUndefined(text) ? undefined : placeholdersIn(text)
}

/**
 * Every template, and every plural form of it, must have text. A blank form is as bad as a missing
 * one: it renders as an empty string for the counts that select it.
 */
function checkNotEmpty(
  id: string,
  field: string,
  template: MessageTemplate,
  issues: CatalogIssue[],
): void {
  if (!isString(template) && !isString(template.other)) {
    issues.push({ kind: 'missing-other-form', id, field })
  }
  iterate.forEach(formsOf(template), ([form, text]) => {
    if (text.trim() === '') {
      issues.push({ kind: 'empty-message', id, field, ...(isDefined(form) && { form }) })
    }
  })
}

function compareField(
  id: string,
  field: string,
  actual: MessageTemplate,
  expected: MessageTemplate,
  issues: CatalogIssue[],
): void {
  if (!isString(actual) && !isString(expected) && actual.plural !== expected.plural) {
    issues.push({
      kind: 'plural-selector-mismatch',
      id,
      field,
      expected: expected.plural,
      actual: actual.plural,
    })
  }

  const expectedForms = formsOf(expected)
  iterate.forEach(formsOf(actual), ([form, text]) => {
    const want = expectedFor(expectedForms, form)
    if (isUndefined(want)) return
    const have = placeholdersIn(text)
    if (sameSet(have, want)) return
    issues.push({
      kind: 'placeholder-mismatch',
      id,
      field,
      ...(isDefined(form) && { form }),
      missing: [...want].filter((name) => !have.has(name)),
      extra: [...have].filter((name) => !want.has(name)),
    })
  })
}

/**
 * Validates a catalog.
 *
 * **Against the contract** (`validateCatalog(catalog, contract)`, with `contract` from
 * `praxis-kit-diagnostics/contract`): the way to validate a language pack. It needs no English, never
 * throws on malformed input, and returns a `Report` that keeps structural errors apart from
 * completeness. See `checkCatalog`.
 *
 * **Against a reference catalog** (`validateCatalog(catalog, reference)`): the earlier form, which
 * compares each field and plural form with another catalog, normally English.
 *
 * @deprecated The reference form. Validate against the contract instead; it knows which context keys
 * exist, which are essential, and which ids are deprecated or removed, none of which a catalog can say.
 */
export function validateCatalog(catalog: MessageCatalog, reference: MessageCatalog): CatalogIssue[]
export function validateCatalog(catalog: unknown, contract: DiagnosticsContract): Report
export function validateCatalog(
  catalog: unknown,
  second: MessageCatalog | DiagnosticsContract,
): CatalogIssue[] | Report {
  if ('ids' in second) return checkCatalog(catalog, second)
  return validateAgainstReference(catalog as MessageCatalog, second)
}

/**
 * Checks a locale's catalog against a reference (normally the English one) and returns every
 * problem found; an empty array means the catalog is sound. It checks that:
 *
 * - the locale is a well-formed BCP 47 tag,
 * - every reference id is present (`missing-id`) and none is invented (`unknown-id`),
 * - every field the reference has is present (`missing-field`) and none is invented
 *   (`unknown-field`),
 * - each field, and each plural form within it, uses exactly the placeholders the reference does.
 *   Fields and forms are compared one by one, so a variable left out of one message or one plural
 *   branch is caught even when it appears in another (`placeholder-mismatch`),
 * - plural templates select on the same count as the reference (`plural-selector-mismatch`),
 * - no field, and no plural form of one, is blank (`empty-message`), and every plural template has
 *   an `other` form (`missing-other-form`).
 */
function validateAgainstReference(
  catalog: MessageCatalog,
  reference: MessageCatalog,
): CatalogIssue[] {
  const issues: CatalogIssue[] = []

  try {
    assertValidLocale(catalog.locale)
  } catch (error) {
    issues.push({ kind: 'invalid-locale', message: (error as Error).message })
  }

  iterate.forEachKey(reference.messages, (id) => {
    if (!Object.hasOwn(catalog.messages, id)) issues.push({ kind: 'missing-id', id })
  })

  iterate.forEachEntry(catalog.messages, (id, entry) => {
    const referenceEntry = Object.hasOwn(reference.messages, id)
      ? reference.messages[id]
      : undefined
    if (isUndefined(referenceEntry)) {
      issues.push({ kind: 'unknown-id', id })
      return
    }

    const actualFields = fieldsOf(entry)
    for (const [field, template] of actualFields) checkNotEmpty(id, field, template, issues)
    const expectedFields = fieldsOf(referenceEntry)
    iterate.forEach(expectedFields, ([field, expected]) => {
      const actual = actualFields.get(field)
      if (isUndefined(actual)) issues.push({ kind: 'missing-field', id, field })
      else compareField(id, field, actual, expected, issues)
    })
    iterate.forEach(actualFields.keys(), (field) => {
      if (!expectedFields.has(field)) issues.push({ kind: 'unknown-field', id, field })
    })
  })

  return issues
}
