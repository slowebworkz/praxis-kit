import { assertValidLocale } from './resolver'
import type { MessageCatalog, MessageEntry, MessageTemplate } from './types'

export type CatalogIssue =
  | { kind: 'invalid-locale'; message: string }
  | { kind: 'missing-id'; id: string }
  | { kind: 'unknown-id'; id: string }
  | { kind: 'empty-message'; id: string }
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
  if (entry.rationale !== undefined) fields.set('rationale', entry.rationale)
  entry.suggestions?.forEach((suggestion, index) => {
    fields.set(`suggestions.${index}.title`, suggestion.title)
    if (suggestion.description !== undefined) {
      fields.set(`suggestions.${index}.description`, suggestion.description)
    }
    if (suggestion.fix !== undefined) fields.set(`suggestions.${index}.fix`, suggestion.fix)
  })
  return fields
}

type Forms = Map<string | undefined, string>

/** A template's text by plural form; a plain string is the single form `undefined`. */
function formsOf(template: MessageTemplate): Forms {
  if (typeof template === 'string') return new Map([[undefined, template]])
  const { plural: _selector, ...rest } = template
  const forms: Forms = new Map()
  for (const [form, text] of Object.entries(rest)) {
    if (typeof text === 'string') forms.set(form, text)
  }
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
  return text === undefined ? undefined : placeholdersIn(text)
}

function compareField(
  id: string,
  field: string,
  actual: MessageTemplate,
  expected: MessageTemplate,
  issues: CatalogIssue[],
): void {
  if (
    typeof actual !== 'string' &&
    typeof expected !== 'string' &&
    actual.plural !== expected.plural
  ) {
    issues.push({
      kind: 'plural-selector-mismatch',
      id,
      field,
      expected: expected.plural,
      actual: actual.plural,
    })
  }

  const expectedForms = formsOf(expected)
  for (const [form, text] of formsOf(actual)) {
    const want = expectedFor(expectedForms, form)
    if (want === undefined) continue
    const have = placeholdersIn(text)
    if (sameSet(have, want)) continue
    issues.push({
      kind: 'placeholder-mismatch',
      id,
      field,
      ...(form !== undefined && { form }),
      missing: [...want].filter((name) => !have.has(name)),
      extra: [...have].filter((name) => !want.has(name)),
    })
  }
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
 * - no entry has an empty message.
 */
export function validateCatalog(
  catalog: MessageCatalog,
  reference: MessageCatalog,
): CatalogIssue[] {
  const issues: CatalogIssue[] = []

  try {
    assertValidLocale(catalog.locale)
  } catch (error) {
    issues.push({ kind: 'invalid-locale', message: (error as Error).message })
  }

  for (const id of Object.keys(reference.messages)) {
    if (!(id in catalog.messages)) issues.push({ kind: 'missing-id', id })
  }

  for (const [id, entry] of Object.entries(catalog.messages)) {
    const referenceEntry = reference.messages[id]
    if (referenceEntry === undefined) {
      issues.push({ kind: 'unknown-id', id })
      continue
    }

    if ([...formsOf(entry.message).values()].every((text) => text.trim() === '')) {
      issues.push({ kind: 'empty-message', id })
    }

    const actualFields = fieldsOf(entry)
    const expectedFields = fieldsOf(referenceEntry)
    for (const [field, expected] of expectedFields) {
      const actual = actualFields.get(field)
      if (actual === undefined) issues.push({ kind: 'missing-field', id, field })
      else compareField(id, field, actual, expected, issues)
    }
    for (const field of actualFields.keys()) {
      if (!expectedFields.has(field)) issues.push({ kind: 'unknown-field', id, field })
    }
  }

  return issues
}
