import type { AnyRecord, ElementType } from '@praxis-kit/core'
import { enforceAllowedAs } from '@praxis-kit/core'
import { iterate } from '@praxis-kit/primitive'

import { applyFilter, resolveNormalizedProps } from '../props'

import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { FilterPredicate } from '../types'

// Minimal structural shape the SSR renderer needs — matches every non-VDOM adapter's
// LooseRuntime (Lit, Web) without requiring them to import a shared generic type.
export type SsrRuntime = {
  resolveTag(as?: ElementType): ElementType
  resolveProps(props: AnyRecord): AnyRecord
  resolveClasses(
    tag: ElementType,
    props: AnyRecord,
    className?: string,
    recipe?: string,
  ): string | undefined
  resolveAria<P extends AnyRecord>(tag: ElementType, props: P): { props: P }
  options: {
    readonly allowedAs?: readonly ElementType[]
    readonly diagnostics?: Diagnostics
    readonly displayName?: string
    readonly variantKeys: ReadonlySet<string>
    readonly normalizeFn?: (props: AnyRecord) => AnyRecord
    readonly htmlPropNormalizersFn?: (
      tag: ElementType,
    ) => readonly ((props: AnyRecord) => AnyRecord)[] | undefined
  }
}

export type SsrBundle = {
  readonly runtime: SsrRuntime
  readonly filterProps: FilterPredicate
}

// A tag name is written directly into the returned markup as `<${tag}...>` — unlike an attribute
// value (escapeAttr, below), there is no legal HTML escaping for a tag name: `&lt;` inside `<...>`
// is not a tag delimiter, it's text. An invalid tag can only be rejected, never made safe.
//
// This is a separate, unconditional check from `enforceAllowedAs` (called right after this one, in
// renderBundleToString below): `enforceAllowedAs` is a *semantic* allowlist that only runs when a
// component declares `allowedAs`, and — critically — reports through the pluggable `diagnostics`
// system, which a consumer can configure as `silentDiagnostics` and thereby choose to ignore. That
// makes it structurally unsuitable as the thing standing between an untrusted `as` prop and raw
// markup: a component with no `allowedAs` at all (the common case) skips it entirely, and even a
// component that has one could have it silenced. `resolveTag()` itself performs no validation
// either — `as ?? defaultTag`, verbatim (see lib/primitive/src/tag/resolve-tag.ts) — and
// `ElementType` is `IntrinsicTag | (string & {})`, so a caller can pass an arbitrary string as
// `as` under full type safety, no unsafe cast required. This check is the one unconditional,
// un-silenceable boundary between `resolveTag()`'s output and serialization — every `tag` this
// function emits into HTML must pass it, regardless of what a given component does or doesn't
// declare.
const SAFE_TAG_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/

function assertSerializableTag(tag: string): void {
  if (!SAFE_TAG_NAME.test(tag)) {
    throw new Error(
      `[renderBundleToString] refusing to serialize invalid tag name "${tag}" — an SSR tag must ` +
        'match /^[a-zA-Z][a-zA-Z0-9-]*$/ (a valid HTML or custom-element tag name). It is written ' +
        'directly into the returned markup with no further escaping possible, so an invalid value ' +
        'can only be rejected, never sanitized.',
    )
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function buildAttrString(attributes: AnyRecord): string {
  const parts: string[] = []
  iterate.forEachEntry(attributes, (key, value) => {
    if (value === false || value === null || value === undefined) return
    if (value === true) {
      parts.push(key)
    } else {
      parts.push(`${key}="${escapeAttr(String(value))}"`)
    }
  })
  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}

/**
 * Renders a praxis-kit non-VDOM component (Lit, Web) to an HTML string without
 * requiring a DOM. Tag polymorphism works correctly in SSR — `options.tag` and the
 * `as` prop are resolved directly to the HTML element tag.
 *
 * `innerHTML` is assumed to be trusted, already-escaped HTML and is inserted
 * verbatim — it is not escaped here. Callers are responsible for escaping any
 * untrusted content before passing it.
 *
 * The resolved tag, by contrast, is validated unconditionally (`assertSerializableTag`, above) —
 * it has no legal escaping once interpolated into `<${tag}...>`, so unlike `innerHTML` this is not
 * a "caller's responsibility" boundary: an `as` prop that resolves to anything other than a
 * syntactically valid tag name throws here rather than reaching the returned string.
 */
export function renderBundleToString(
  bundle: SsrBundle,
  props: AnyRecord = {},
  innerHTML = '',
): string {
  const {
    filterProps,
    runtime: { options, resolveAria, resolveClasses, resolveProps, resolveTag },
  } = bundle
  const { as, className, recipe, class: classAttr, ...rest } = props

  const tag = resolveTag(as as ElementType | undefined)
  assertSerializableTag(tag)
  if (options.allowedAs !== undefined) {
    enforceAllowedAs(tag, options.allowedAs, options.diagnostics, options.displayName)
  }
  const mergedProps = resolveProps(rest)
  const finalProps = resolveNormalizedProps(options, tag, mergedProps)

  const resolvedClass = resolveClasses(
    tag,
    finalProps,
    // Accept both React-style className and HTML-native class
    (className as string | undefined) ?? (classAttr as string | undefined),
    recipe as string | undefined,
  )

  const ariaResult = resolveAria(tag, finalProps)
  const filtered = applyFilter(ariaResult.props, filterProps, options.variantKeys)

  // Runtime-generated class always wins over any pipeline-filtered `class` prop.
  const attrs: AnyRecord = { ...filtered, class: resolvedClass || undefined }
  const attrStr = buildAttrString(attrs)

  return `<${tag}${attrStr}>${innerHTML}</${tag}>`
}
