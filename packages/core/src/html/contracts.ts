import type { AriaContext, AriaFix, AriaResult, ChildRuleInput, EnforcementOptions } from '../types'
import { isString, isTag } from '@praxis-kit/shared/guards'
import { isObject } from '@praxis-kit/primitive'

// Matches any element whose tag is NOT in the blocked set, plus component children
// (whose `type` is a function/class rather than a string). Used as the open-content
// catch-all alongside a constrained singleton child (e.g. figcaption, summary, legend).
function isOpenContent(...blockedTags: string[]): (child: unknown) => child is object {
  const set = new Set(blockedTags)
  return (child: unknown): child is object =>
    isObject(child) &&
    'type' in child &&
    (!isString((child as { type: unknown }).type) || !set.has((child as { type: string }).type))
}

// ─── Shared rule fragments ────────────────────────────────────────────────────

const METADATA_TAGS = ['script', 'template'] as const
const metadataMatch = isTag(...METADATA_TAGS)

function metadata(name = 'metadata'): ChildRuleInput {
  return { name, match: metadataMatch }
}

function firstOptional(name: string, tag: string): ChildRuleInput {
  return { name, match: isTag(tag), cardinality: { max: 1 }, position: 'first' }
}

function contract(children: readonly ChildRuleInput[]): EnforcementOptions {
  return { strict: 'warn', children }
}

function ariaContract(aria: NonNullable<EnforcementOptions['aria']>): EnforcementOptions {
  return { strict: 'warn', aria }
}

// An optional singleton that must be the first child, followed by open flow content.
// Used by <details> and <fieldset> where the landmark child is positionally constrained.
// Not suitable for <figure>: <figcaption> may be first or last.
function firstChildContract(name: string, tag: string): EnforcementOptions {
  return contract([firstOptional(name, tag), { name: 'content', match: isOpenContent(tag) }])
}

// ─── Tag groups ───────────────────────────────────────────────────────────────

const VOID_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
] as const

// section and form are excluded: their landmark role is conditional on having an
// accessible name, so enforcement here would fire incorrectly on unlabelled usage.
const LANDMARK_TAGS = ['article', 'aside', 'footer', 'header', 'main', 'nav'] as const

// ─── Contracts ────────────────────────────────────────────────────────────────

/**
 * `<ul>`, `<ol>`, `<menu>` — direct children must be `<li>`, `<script>`, or `<template>`.
 */
export const listContract = contract([{ name: 'list-item', match: isTag('li', ...METADATA_TAGS) }])

/**
 * `<table>` — valid direct children per HTML5 content model.
 * `<caption>` is optional and must be first; `<thead>` and `<tfoot>` are at most one each.
 * Section ordering (caption → colgroup → thead → tbody → tfoot) is not enforced: the
 * engine only supports `position: 'first' | 'last'`, not inter-rule sequence constraints.
 */
export const tableContract = contract([
  firstOptional('caption', 'caption'),
  { name: 'colgroup', match: isTag('colgroup') },
  { name: 'thead', match: isTag('thead'), cardinality: { max: 1 } },
  { name: 'tbody', match: isTag('tbody') },
  { name: 'tfoot', match: isTag('tfoot'), cardinality: { max: 1 } },
  { name: 'table-row', match: isTag('tr', ...METADATA_TAGS) },
])

/**
 * `<thead>`, `<tbody>`, `<tfoot>` — direct children must be `<tr>`, `<script>`, or `<template>`.
 */
export const tableBodyContract = contract([
  { name: 'table-row', match: isTag('tr', ...METADATA_TAGS) },
])

/**
 * `<tr>` — direct children must be `<td>`, `<th>`, `<script>`, or `<template>`.
 */
export const tableRowContract = contract([
  { name: 'table-cell', match: isTag('td', 'th', ...METADATA_TAGS) },
])

/**
 * `<colgroup>` — direct children must be `<col>` or `<template>`.
 */
export const colgroupContract = contract([{ name: 'column', match: isTag('col', 'template') }])

/**
 * `<dl>` — direct children must be `<dt>`, `<dd>`, `<div>` (as group wrapper),
 * `<script>`, or `<template>`.
 */
export const dlContract = contract([
  { name: 'term', match: isTag('dt') },
  { name: 'description', match: isTag('dd') },
  { name: 'group', match: isTag('div') },
  metadata(),
])

/**
 * `<select>` — direct children must be `<option>`, `<optgroup>`, `<hr>`, `<script>`,
 * or `<template>`.
 */
export const selectContract = contract([
  { name: 'option', match: isTag('option', 'optgroup', 'hr', ...METADATA_TAGS) },
])

/**
 * `<optgroup>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
export const optgroupContract = contract([
  { name: 'option', match: isTag('option', ...METADATA_TAGS) },
])

/**
 * `<datalist>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
export const datalistContract = contract([
  { name: 'option', match: isTag('option', ...METADATA_TAGS) },
])

/**
 * `<picture>` — any number of `<source>` elements followed by exactly one `<img>`.
 * `<img>` must be last; `<source>` elements after `<img>` are ignored by browsers.
 */
export const pictureContract = contract([
  { name: 'source', match: isTag('source', ...METADATA_TAGS) },
  { name: 'image', match: isTag('img'), cardinality: { min: 1, max: 1 }, position: 'last' },
])

/**
 * `<figure>` — at most one `<figcaption>` (first or last); any other flow content permitted.
 * Position is intentionally unconstrained: the spec allows figcaption first or last.
 */
export const figureContract = contract([
  { name: 'caption', match: isTag('figcaption'), cardinality: { max: 1 } },
  { name: 'content', match: isOpenContent('figcaption') },
])

/**
 * `<details>` — at most one `<summary>` and it must be the first child; any other flow content permitted.
 */
export const detailsContract = firstChildContract('summary', 'summary')

/**
 * `<fieldset>` — at most one `<legend>` and it must be the first child; any other flow content permitted.
 */
export const fieldsetContract = firstChildContract('legend', 'legend')

/**
 * `<audio>` and `<video>` — zero or more `<source>`/`<track>`/`<script>`/`<template>` elements
 * plus fallback flow content (any element that is not one of the above).
 */
const mediaContract = contract([
  { name: 'source', match: isTag('source') },
  { name: 'track', match: isTag('track') },
  metadata(),
  { name: 'content', match: isOpenContent('source', 'track', ...METADATA_TAGS) },
])

export const audioContract = mediaContract
export const videoContract = mediaContract

/**
 * `<head>` — metadata content only.
 */
export const headContract = contract([
  {
    name: 'metadata',
    match: isTag('base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title'),
  },
])

/**
 * `<html>` — one `<head>` and one `<body>`.
 */
export const htmlContract = contract([
  { name: 'head', match: isTag('head'), cardinality: { min: 1, max: 1 }, position: 'first' },
  { name: 'body', match: isTag('body'), cardinality: { min: 1, max: 1 } },
])

/**
 * Void elements — the HTML spec forbids any children. An empty rule set means every
 * child is flagged as unexpected.
 */
export const voidContract = contract([])

// ─── Landmark role contract ───────────────────────────────────────────────────

const LANDMARK_TAG_SET = new Set<string>(LANDMARK_TAGS)

const removeLandmarkRoleOverride: AriaFix = {
  kind: 'removeRole',
  apply: ({ props }) => {
    if (!('role' in props)) return { applied: false, next: props }
    const { role: _r, ...rest } = props
    return { applied: true, next: rest, previous: props }
  },
}

function landmarkRoleRule({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
  if (!LANDMARK_TAG_SET.has(tag) || !implicitRole) return []
  const role = props.role
  // role === implicitRole is already caught by the built-in #checkRedundantRole (warns, removes).
  if (!role || role === implicitRole) return []
  return [
    {
      valid: false,
      fixable: true,
      severity: 'error',
      fix: removeLandmarkRoleOverride,
      message: `<${tag}> has a fixed landmark role="${implicitRole}". role="${role}" overrides it and confuses assistive technology. The override has been removed.`,
    },
  ]
}

/**
 * Elements with an unconditional landmark role (`<article>`, `<aside>`, `<footer>`,
 * `<header>`, `<main>`, `<nav>`).
 *
 * - `role="<implicit>"` → warning: redundant, removed (built-in engine behaviour).
 * - `role="<anything else>"` → error: overrides the fixed landmark, removed.
 */
export const landmarkContract = ariaContract([landmarkRoleRule])

// ─── Convenience map ──────────────────────────────────────────────────────────

const CONTRACT_GROUPS = [
  [VOID_TAGS, voidContract],
  [LANDMARK_TAGS, landmarkContract],
  [['ul', 'ol', 'menu'], listContract],
  [['audio', 'video'], mediaContract],
  [['thead', 'tbody', 'tfoot'], tableBodyContract],
] as const

function contractMap(
  groups: readonly (readonly [readonly string[], EnforcementOptions])[],
): Record<string, EnforcementOptions> {
  return Object.fromEntries(
    groups.flatMap(([tags, enforcement]) => tags.map((tag) => [tag, enforcement])),
  )
}

/**
 * Ready-made `EnforcementOptions` objects keyed by HTML element tag name.
 *
 * Pass directly to `createContractComponent`:
 * ```ts
 * const List = createContractComponent({ tag: 'ul', enforcement: htmlContracts.ul })
 * ```
 *
 * All contracts default to `strict: 'warn'`. Override with a spread to change severity:
 * ```ts
 * enforcement: { ...htmlContracts.ul, strict: 'throw' }
 * ```
 */
export const htmlContracts: Record<string, EnforcementOptions> = {
  ...contractMap(CONTRACT_GROUPS),

  table: tableContract,
  tr: tableRowContract,
  colgroup: colgroupContract,

  dl: dlContract,

  select: selectContract,
  optgroup: optgroupContract,
  datalist: datalistContract,

  picture: pictureContract,

  figure: figureContract,
  details: detailsContract,
  fieldset: fieldsetContract,

  head: headContract,
  html: htmlContract,
}
