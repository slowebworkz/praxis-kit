import type { StringMap } from '@praxis-kit/foundation'
import {
  isArray,
  isDefined,
  isNumber,
  isNonNullObject as isRecord,
  isString,
  isUndefined,
  iterate,
} from '@praxis-kit/foundation'
import type {
  ContextKeySpec,
  ContextKind,
  DiagnosticsContract,
  ExtensionContract,
  IdContract,
  NormalizedExtensions,
} from './contract'
import { assertValidLocale } from './resolver'

// ─── Report ───────────────────────────────────────────────────────────────────

/**
 * What kind of problem. Structural problems (`errors`) mean the catalog is wrong and must not be
 * used. They are kept apart from completeness (`incomplete`, `coverage`), which only says how much of
 * the contract is translated: an unfinished catalog is not an invalid one.
 */
export type IssueKind =
  | 'invalid-structure'
  | 'invalid-locale'
  | 'invalid-contract'
  | 'contract-incompatible'
  | 'unknown-id'
  | 'unknown-field'
  | 'empty-message'
  | 'missing-other-form'
  | 'plural-selector-mismatch'
  | 'invalid-plural-form'
  | 'unknown-context-key'
  | 'optional-context-key'
  | 'unknown-filter'
  | 'filter-kind-mismatch'
  | 'placeholder-missing-essential'
  | 'placeholder-omitted'

export interface Issue {
  kind: IssueKind
  id?: string
  /** `message`, `rationale`, or `suggestions.N.title|description|fix`. */
  field?: string
  /** The plural form, when the problem is in one form of a plural template. */
  form?: string
  /** A developer-facing explanation (English, for the CLI and test output; never shown to users). */
  message: string
}

export interface Report {
  contract: { required: number; catalog: number | undefined; compatible: boolean; runtime: string }
  /** Structural problems. A catalog with any of these must not be used. */
  errors: Issue[]
  /** Suspicious but allowed: a non-essential placeholder left out. */
  warnings: Issue[]
  /** Translations of ids the contract has removed. */
  obsolete: { id: string; removedIn: string; replacedBy?: string }[]
  /** Translations of ids the contract has deprecated; they still render. */
  deprecated: { id: string; since: string; replacedBy?: string }[]
  /** Contract ids with no translation, or a partial one. Not an error. */
  incomplete: { id: string; since: string; missing: string[] }[]
  /** Over catalog-driven ids only. */
  coverage: { translated: number; total: number; ratio: number; notCatalogDriven: number }
}

export interface CheckOptions {
  /** Ids of your own (custom rules), checked as extensions. Without this, any id outside the contract
   *  is an `unknown-id` error: the contract stays authoritative. */
  extensions?: ExtensionContract
}

// ─── Helpers ─────────────

// No boolean guard exists in foundation; this is the one place a context spec needs it.
const isBooleanValue = (value: unknown): value is boolean => typeof value === 'boolean'

const KNOWN_FILTERS = new Set(['quote', 'list', 'list-or', 'list-unit'])
const LIST_FILTERS = new Set(['list', 'list-or', 'list-unit'])
const TOKEN = /\{([A-Za-z_$][\w$]*)((?:\|[a-z-]+)*)\}/g
const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])
const ENTRY_KEYS = new Set(['message', 'rationale', 'suggestions', '$comment'])
const TOP_LEVEL_KEYS = new Set([
  '$schema',
  '$comment',
  'contract',
  'builtAgainst',
  'locale',
  'messages',
])
// Lower-case throughout: letters, digits and hyphens, at least two dot-separated segments. No
// underscores, so `acme.no-div-dialog` is valid and `acme.NoDiv`, `acme.no_div` are not.
const EXTENSION_ID = /^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/
const SUGGESTION_KEYS = new Set(['title', 'description', 'fix'])

interface Token {
  name: string
  filters: string[]
}

function tokensIn(text: string): Token[] {
  return [...text.matchAll(TOKEN)].map((match) => ({
    name: match[1] as string,
    filters: match[2] ? (match[2] as string).slice(1).split('|') : [],
  }))
}

/** A template's text by plural form; a plain string is the single form `undefined`. */
function formsOf(template: unknown): Map<string | undefined, string> | undefined {
  if (isString(template)) return new Map([[undefined, template]])
  if (!isRecord(template) || !isString(template['plural'])) return undefined
  const forms = new Map<string | undefined, string>()
  iterate.forEachEntry(template, (form, text) => {
    if (form !== 'plural' && isString(text)) forms.set(form, text)
  })
  return forms
}

function fieldOf(id: string, field: string, form: string | undefined) {
  return { id, field, ...(isDefined(form) && { form }) }
}

const EXTENSION_KEYS = new Set(['$schema', '$comment', 'ids'])
const EXTENSION_ID_KEYS = new Set(['$comment', 'context', 'plural', 'rationale', 'suggestions'])
const EXTENSION_CONTEXT_KEYS = new Set([
  'kind',
  'required',
  'essential',
  'informational',
  'description',
])

/**
 * Turns an extension file into id contracts, or throws a RangeError saying what is wrong with it.
 * Nothing is defaulted silently: a malformed or unexpected field is an error, because a typo here
 * would otherwise weaken validation without a word.
 *
 * This throws, unlike `checkCatalog`, which reports. The two differ on purpose: a malformed catalog
 * is data under test, so it becomes a `Report`; a malformed extension contract is the tool's own
 * configuration, so there is nothing meaningful to report against. The CLI catches it and exits 64.
 * Call it yourself first (or catch the `RangeError`) when you pass `extensions` to `checkCatalog`.
 */
export function normalizeExtensions(
  extension: unknown,
  contract: DiagnosticsContract,
): NormalizedExtensions {
  const fail = (message: string): never => {
    throw new RangeError(`Invalid extension contract: ${message}`)
  }
  const onlyKeys = (where: string, object: StringMap<unknown>, allowed: ReadonlySet<string>) =>
    iterate.forEachKey(object, (key) => {
      if (!allowed.has(key)) {
        fail(`${where} has an unknown field "${key}" (allowed: ${[...allowed].join(', ')}).`)
      }
    })

  if (!isRecord(extension) || !isRecord(extension['ids'])) {
    return fail('expected { "ids": { ... } }.')
  }
  onlyKeys('the file', extension, EXTENSION_KEYS)
  const out: NormalizedExtensions = {}

  iterate.forEachEntry(extension['ids'], (id, raw) => {
    if (!EXTENSION_ID.test(id)) {
      fail(
        `"${id}" must be namespaced and lower-case (letters, digits, hyphens; dot-separated), like "acme.no-div-dialog".`,
      )
    }
    if (Object.hasOwn(contract.ids, id)) fail(`"${id}" is already a built-in id.`)
    if (!isRecord(raw)) return fail(`"${id}" must be an object.`)
    onlyKeys(`"${id}"`, raw, EXTENSION_ID_KEYS)

    const rawContext = Object.hasOwn(raw, 'context') ? raw['context'] : {}
    if (!isRecord(rawContext)) return fail(`"${id}".context must be an object.`)
    const context: StringMap<ContextKeySpec> = {}
    iterate.forEachEntry(rawContext, (key, spec) => {
      const where = `"${id}" context key "${key}"`
      if (!isRecord(spec)) return fail(`${where} must be an object.`)
      onlyKeys(where, spec, EXTENSION_CONTEXT_KEYS)
      const kind = spec['kind']
      if (!isString(kind) || !Object.hasOwn(contract.kinds, kind)) {
        return fail(`${where} needs a "kind" (${Object.keys(contract.kinds).join(', ')}).`)
      }
      if (!isBooleanValue(spec['required'])) return fail(`${where} needs a boolean "required".`)
      for (const flag of ['essential', 'informational'] as const) {
        if (Object.hasOwn(spec, flag) && !isBooleanValue(spec[flag])) {
          fail(`${where}.${flag} must be a boolean.`)
        }
      }
      if (spec['essential'] === true && spec['required'] === false) {
        return fail(
          `${where} is essential but not required: a key that can be absent cannot be essential.`,
        )
      }
      if (Object.hasOwn(spec, 'description') && !isString(spec['description'])) {
        fail(`${where}.description must be a string.`)
      }
      context[key] = {
        kind: kind as ContextKind,
        required: spec['required'],
        essential: spec['essential'] === true,
        ...(spec['informational'] === true && { informational: true }),
        description: isString(spec['description']) ? spec['description'] : '',
      }
    })

    let plural: string | undefined
    if (Object.hasOwn(raw, 'plural')) {
      plural = isString(raw['plural']) ? raw['plural'] : undefined
      if (isUndefined(plural)) return fail(`"${id}".plural must be a string (a context key).`)
      if (context[plural]?.kind !== 'number') {
        return fail(`"${id}".plural "${plural}" must name a context key of kind "number".`)
      }
    }
    if (Object.hasOwn(raw, 'rationale') && !isBooleanValue(raw['rationale'])) {
      return fail(`"${id}".rationale must be a boolean.`)
    }
    const suggestions = Object.hasOwn(raw, 'suggestions') ? raw['suggestions'] : 0
    if (!isNumber(suggestions) || !Number.isInteger(suggestions) || suggestions < 0) {
      return fail(`"${id}".suggestions must be a non-negative integer.`)
    }

    out[id] = {
      codes: [],
      category: 'custom',
      description: '',
      context,
      ...(isDefined(plural) && { plural }),
      rationale: raw['rationale'] === true,
      suggestions,
      since: '0.0',
      examples: [],
    }
  })
  return out
}

// ─── The check ────────────────────────────────────────────────────────────────

/**
 * Checks a catalog against the contract. The catalog may be anything loaded from JSON: nothing here
 * throws on malformed input, it reports it. Structural validity is `errors.length === 0`;
 * completeness is `incomplete` and `coverage`, and they never mix.
 *
 * `options.extensions` is the one exception to "never throws": a malformed extension contract is a
 * configuration error and throws a `RangeError` (see `normalizeExtensions`).
 */
export function checkCatalog(
  catalog: unknown,
  contract: DiagnosticsContract,
  options: CheckOptions = {},
): Report {
  const extensions = isUndefined(options.extensions)
    ? {}
    : normalizeExtensions(options.extensions, contract)
  const runtime = `${contract.contract}.${contract.minor}`
  const report: Report = {
    contract: { required: contract.contract, catalog: undefined, compatible: false, runtime },
    errors: [],
    warnings: [],
    obsolete: [],
    deprecated: [],
    incomplete: [],
    coverage: {
      translated: 0,
      total: 0,
      ratio: 0,
      notCatalogDriven: Object.keys(contract.notCatalogDriven).length,
    },
  }
  const error = (issue: Issue) => void report.errors.push(issue)

  if (!isRecord(catalog)) {
    error({ kind: 'invalid-structure', message: 'The catalog must be a JSON object.' })
    return report
  }

  // Contract version. A catalog for another major cannot be trusted at all, so stop here.
  const declared = catalog['contract']
  if (!isNumber(declared) || !Number.isInteger(declared) || declared < 1) {
    error({
      kind: 'invalid-contract',
      message: `"contract" must be a positive integer (the contract major, currently ${contract.contract}).`,
    })
    return report
  }
  report.contract.catalog = declared
  if (declared !== contract.contract) {
    error({
      kind: 'contract-incompatible',
      message: `The catalog is for contract ${declared}, but this version of praxis-kit-diagnostics implements contract ${contract.contract}.`,
    })
    return report
  }
  report.contract.compatible = true

  // The same top-level shape the JSON Schema enforces, so the schema and the CLI cannot disagree.
  iterate.forEachKey(catalog, (key) => {
    if (!TOP_LEVEL_KEYS.has(key)) {
      error({
        kind: 'unknown-field',
        field: key,
        message: `"${key}" is not a top-level field of a catalog (allowed: ${[...TOP_LEVEL_KEYS].join(', ')}).`,
      })
    }
  })
  iterate.forEach(['$schema', '$comment'] as const, (key) => {
    if (key in catalog && !isString(catalog[key])) {
      error({ kind: 'invalid-structure', field: key, message: `"${key}" must be a string.` })
    }
  })
  if (
    'builtAgainst' in catalog &&
    !(isString(catalog['builtAgainst']) && /^[0-9]+\.[0-9]+$/.test(catalog['builtAgainst']))
  ) {
    error({
      kind: 'invalid-structure',
      field: 'builtAgainst',
      message: '"builtAgainst" must be a string like "1.3" (major.minor), not a number.',
    })
  }

  let locale: string | undefined
  try {
    assertValidLocale(catalog['locale'])
    locale = catalog['locale'] as string
  } catch (error_) {
    error({ kind: 'invalid-locale', message: (error_ as Error).message })
  }

  const messages = catalog['messages']
  if (!isRecord(messages)) {
    error({
      kind: 'invalid-structure',
      message: '"messages" must be an object keyed by message id.',
    })
    return report
  }

  const live = Object.entries(contract.ids).filter(([, spec]) => isUndefined(spec.removedIn))
  report.coverage.total = live.length
  const pluralCategories = locale
    ? new Set(new Intl.PluralRules(locale).resolvedOptions().pluralCategories)
    : undefined

  // Ids the catalog has.
  iterate.forEachEntry(messages, (id, entry) => {
    const spec = Object.hasOwn(contract.ids, id)
      ? contract.ids[id]
      : Object.hasOwn(extensions, id)
        ? extensions[id]
        : undefined
    if (isUndefined(spec)) {
      const custom = EXTENSION_ID.test(id)
      error({
        kind: 'unknown-id',
        id,
        message: custom
          ? `"${id}" is not an id in the contract. If it belongs to a custom rule, declare it in an extension contract (--extension <file>); otherwise it is a typo.`
          : `"${id}" is not an id in the contract. It is a typo, or from a newer contract.`,
      })
      return
    }
    if (isDefined(spec.removedIn)) {
      report.obsolete.push({
        id,
        removedIn: spec.removedIn,
        ...(isDefined(spec.replacedBy) && { replacedBy: spec.replacedBy }),
      })
      return
    }
    if (isDefined(spec.deprecated)) {
      report.deprecated.push({
        id,
        since: spec.deprecated.since,
        ...(isDefined(spec.deprecated.replacedBy) && { replacedBy: spec.deprecated.replacedBy }),
      })
    }
    checkEntry(id, entry, spec, pluralCategories, report)
  })

  // Completeness.
  iterate.forEach(live, ([id, spec]) => {
    const entry = Object.hasOwn(messages, id) ? messages[id] : undefined
    if (!isRecord(entry) || !('message' in entry)) {
      report.incomplete.push({ id, since: spec.since, missing: ['message'] })
      return
    }
    report.coverage.translated++
    const missing: string[] = []
    if (spec.rationale && isUndefined(entry['rationale'])) missing.push('rationale')
    const have = isArray(entry['suggestions']) ? entry['suggestions'].length : 0
    if (have < spec.suggestions) missing.push('suggestions')
    if (missing.length > 0) report.incomplete.push({ id, since: spec.since, missing })
  })
  report.coverage.ratio =
    report.coverage.total === 0 ? 1 : report.coverage.translated / report.coverage.total

  return report
}

function checkEntry(
  id: string,
  entry: unknown,
  spec: IdContract,
  pluralCategories: Set<string> | undefined,
  report: Report,
): void {
  const error = (issue: Issue) => void report.errors.push(issue)
  const warn = (issue: Issue) => void report.warnings.push(issue)

  if (!isRecord(entry)) {
    error({ kind: 'invalid-structure', id, message: `"${id}" must be an object with a "message".` })
    return
  }
  iterate.forEachKey(entry, (key) => {
    if (!ENTRY_KEYS.has(key)) {
      error({
        kind: 'unknown-field',
        id,
        field: key,
        message: `"${key}" is not a field of a catalog entry.`,
      })
    }
  })

  const usedAnywhere = new Set<string>()

  const checkTemplate = (field: string, template: unknown, isMessage: boolean): void => {
    const forms = formsOf(template)
    if (isUndefined(forms)) {
      error({
        kind: 'invalid-structure',
        ...fieldOf(id, field, undefined),
        message: `"${field}" must be a string or a plural object with a "plural" selector.`,
      })
      return
    }

    if (!isString(template) && isRecord(template)) {
      const selector = template['plural'] as string
      const key = spec.context?.[selector]
      if (isDefined(spec.plural) && selector !== spec.plural) {
        error({
          kind: 'plural-selector-mismatch',
          ...fieldOf(id, field, undefined),
          message: `Plural selector "${selector}" must be "${spec.plural}" for this id.`,
        })
      } else if (isUndefined(key) || key.kind !== 'number') {
        error({
          kind: 'plural-selector-mismatch',
          ...fieldOf(id, field, undefined),
          message: `Plural selector "${selector}" must be a number key in this id's context.`,
        })
      }
      if (!isString(template['other'])) {
        error({
          kind: 'missing-other-form',
          ...fieldOf(id, field, undefined),
          message: `A plural template needs an "other" form: it is the fallback for every count no other form names.`,
        })
      }
      iterate.forEachKey(template, (form) => {
        if (form === 'plural') return
        if (!PLURAL_CATEGORIES.has(form)) {
          error({
            kind: 'invalid-plural-form',
            ...fieldOf(id, field, form),
            message: `"${form}" is not a plural category (zero, one, two, few, many, other).`,
          })
        } else if (isDefined(pluralCategories) && !pluralCategories.has(form)) {
          error({
            kind: 'invalid-plural-form',
            ...fieldOf(id, field, form),
            message: `The "${form}" form is never selected in this locale.`,
          })
        }
      })
    }

    iterate.forEach(forms, ([form, text]) => {
      const where = fieldOf(id, field, form)
      if (text.trim() === '') {
        error({
          kind: 'empty-message',
          ...where,
          message: `"${field}" is blank, so it would render as empty text.`,
        })
        return
      }
      const seen = new Set<string>()
      iterate.forEach(tokensIn(text), ({ name, filters }) => {
        seen.add(name)
        usedAnywhere.add(name)
        const key = spec.context?.[name]
        if (isUndefined(key)) {
          error({
            kind: 'unknown-context-key',
            ...where,
            message: `{${name}} is not a context key of this id.`,
          })
          return
        }
        if (!key.required) {
          error({
            kind: 'optional-context-key',
            ...where,
            message: `{${name}} is optional, so it can be absent and would print as literal {${name}}.`,
          })
        }
        iterate.forEach(filters, (filter) => {
          if (!KNOWN_FILTERS.has(filter)) {
            error({
              kind: 'unknown-filter',
              ...where,
              message: `"${filter}" is not a filter (quote, list, list-or, list-unit).`,
            })
          } else if (LIST_FILTERS.has(filter) && key.kind !== 'string[]') {
            error({
              kind: 'filter-kind-mismatch',
              ...where,
              message: `|${filter} joins a list, but {${name}} is a ${key.kind}.`,
            })
          } else if (filter === 'quote' && !quotable(key.kind)) {
            error({
              kind: 'filter-kind-mismatch',
              ...where,
              message: `|quote does not apply to {${name}}, which is a ${key.kind}.`,
            })
          }
        })
      })
      if (isMessage) {
        iterate.forEachEntry(spec.context ?? {}, (name, key) => {
          if (key.essential && !seen.has(name)) {
            error({
              kind: 'placeholder-missing-essential',
              ...where,
              message: `The message must use {${name}}: ${key.description}`,
            })
          }
        })
      }
    })
  }

  if ('message' in entry) checkTemplate('message', entry['message'], true)
  else
    error({ kind: 'invalid-structure', id, field: 'message', message: `"${id}" has no "message".` })
  if ('rationale' in entry) checkTemplate('rationale', entry['rationale'], false)

  const suggestions = entry['suggestions']
  if (isDefined(suggestions)) {
    if (!isArray(suggestions)) {
      error({
        kind: 'invalid-structure',
        id,
        field: 'suggestions',
        message: '"suggestions" must be an array.',
      })
    } else {
      if (suggestions.length > spec.suggestions) {
        error({
          kind: 'unknown-field',
          id,
          field: `suggestions.${spec.suggestions}`,
          message: `This id has ${spec.suggestions} suggestion(s); the catalog has ${suggestions.length}.`,
        })
      }
      suggestions.forEach((item: unknown, index: number) => {
        if (!isRecord(item)) {
          error({
            kind: 'invalid-structure',
            id,
            field: `suggestions.${index}`,
            message: 'A suggestion must be an object with a "title".',
          })
          return
        }
        iterate.forEachKey(item, (key) => {
          if (!SUGGESTION_KEYS.has(key)) {
            error({
              kind: 'unknown-field',
              id,
              field: `suggestions.${index}.${key}`,
              message: `"${key}" is not a field of a suggestion.`,
            })
          }
        })
        iterate.forEach(['title', 'description'] as const, (part) => {
          if (part in item) checkTemplate(`suggestions.${index}.${part}`, item[part], false)
        })
        if ('fix' in item) checkTemplate(`suggestions.${index}.fix`, item['fix'], false)
      })
    }
  }

  // A non-essential key the entry never uses is allowed, but worth saying.
  iterate.forEachEntry(spec.context ?? {}, (name, key) => {
    if (!key.essential && !key.informational && !usedAnywhere.has(name)) {
      warn({
        kind: 'placeholder-omitted',
        id,
        message: `{${name}} is never used in this entry: ${key.description}`,
      })
    }
  })
}

function quotable(kind: ContextKind): boolean {
  return kind === 'identifier' || kind === 'literal' || kind === 'string[]'
}
