import { isArray, isDefined, isString, isUndefined } from '@praxis-kit/foundation'
import type {
  MessageCatalog,
  MessageEntry,
  MessageTemplate,
  RenderedMessage,
  AnyRecord,
} from './types'

type Context = Readonly<AnyRecord>

// `{name}` or `{name|filter|filter}`. Unknown names are left in place so a mistake is visible
// rather than silently blank.
const TOKEN = /\{([A-Za-z_$][\w$]*)((?:\|[a-z-]+)*)\}/g

const LIST_STYLES = {
  list: { type: 'conjunction', style: 'long' },
  'list-or': { type: 'disjunction', style: 'long' },
  // "a, b, c" in English with no conjunction. Locale rules still decide the separator.
  'list-unit': { type: 'unit', style: 'long' },
} as const satisfies Record<string, Intl.ListFormatOptions>

type ListFilter = keyof typeof LIST_STYLES

function isListFilter(filter: string): filter is ListFilter {
  return filter in LIST_STYLES
}

function applyFilters(value: unknown, filters: readonly string[], locale: string): string {
  let items: unknown[] = isArray(value) ? value : [value]
  let joined: string | undefined

  for (const filter of filters) {
    if (filter === 'quote') {
      items = items.map((item) => `"${String(item)}"`)
    } else if (isListFilter(filter)) {
      joined = new Intl.ListFormat(locale, LIST_STYLES[filter]).format(items.map(String))
    }
  }

  return joined ?? items.map(String).join(', ')
}

export function renderTemplate(template: string, context: Context, locale: string): string {
  return template.replace(TOKEN, (token, name: string, filterPart: string) => {
    const value = context[name]
    if (isUndefined(value)) return token
    const filters = filterPart === '' ? [] : filterPart.slice(1).split('|')
    return applyFilters(value, filters, locale)
  })
}

function pickForm(template: MessageTemplate, context: Context, locale: string): string {
  if (isString(template)) return template
  const count = Number(context[template.plural])
  const category = Number.isNaN(count) ? 'other' : new Intl.PluralRules(locale).select(count)
  return template[category] ?? template.other
}

function render(template: MessageTemplate, context: Context, locale: string): string {
  return renderTemplate(pickForm(template, context, locale), context, locale)
}

/**
 * Renders one catalog entry for one diagnostic's context. A missing entry renders as the id alone
 * (the diagnostic code, or the message id it maps to): context is for a formatter to use when a
 * message exists, and never becomes an ad hoc message, and a missing entry never falls back to
 * another language.
 */
export function renderEntry(
  entry: MessageEntry | undefined,
  id: string,
  context: Context,
  locale: string,
): RenderedMessage {
  if (isUndefined(entry)) return { message: id }

  const rendered: RenderedMessage = { message: render(entry.message, context, locale) }
  if (isDefined(entry.rationale)) rendered.rationale = render(entry.rationale, context, locale)
  if (isDefined(entry.suggestions)) {
    rendered.suggestions = entry.suggestions.map((suggestion) => ({
      title: render(suggestion.title, context, locale),
      ...(isDefined(suggestion.description) && {
        description: render(suggestion.description, context, locale),
      }),
      ...(isDefined(suggestion.fix) && {
        fix: renderTemplate(suggestion.fix, context, locale),
      }),
    }))
  }
  return rendered
}

export function renderFromCatalog(
  catalog: MessageCatalog,
  id: string,
  context: Context,
): RenderedMessage {
  return renderEntry(catalog.messages[id], id, context, catalog.locale)
}
