import type { AriaContext, AriaFix, AriaResult, ChildRuleInput, EnforcementOptions } from '../types'
import { isTag } from '@praxis-kit/shared/guards/children'

// Matches any element whose tag is NOT in the blocked set, plus component children
// (whose `type` is a function/class rather than a string). Used as the open-content
// catch-all in elements like <figure> that allow arbitrary flow content alongside
// one constrained child.
function isFlowContent(...blockedTags: string[]): (child: unknown) => child is object {
  const set = new Set(blockedTags)
  return (child: unknown): child is object =>
    child !== null &&
    typeof child === 'object' &&
    'type' in (child as object) &&
    (typeof (child as { type: unknown }).type !== 'string' ||
      !set.has((child as { type: string }).type))
}

// ─── Shared rule fragments ────────────────────────────────────────────────────

const METADATA_TAGS = ['script', 'template'] as const

function metadata(): ChildRuleInput {
  return { name: 'metadata', match: isTag(...METADATA_TAGS) }
}

// ─── Contracts ────────────────────────────────────────────────────────────────

/**
 * `<ul>` and `<ol>` — direct children must be `<li>`, `<script>`, or `<template>`.
 */
export const listContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'list-item', match: isTag('li', ...METADATA_TAGS) }],
}

/**
 * `<table>` — valid direct children per HTML5 content model.
 * `<caption>` is optional and must be first; `<thead>` and `<tfoot>` are at most one each.
 */
export const tableContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'caption', match: isTag('caption'), cardinality: { max: 1 }, position: 'first' },
    { name: 'colgroup', match: isTag('colgroup') },
    { name: 'thead', match: isTag('thead'), cardinality: { max: 1 } },
    { name: 'tbody', match: isTag('tbody') },
    { name: 'tfoot', match: isTag('tfoot'), cardinality: { max: 1 } },
    { name: 'table-row', match: isTag('tr', ...METADATA_TAGS) },
  ],
}

/**
 * `<thead>`, `<tbody>`, and `<tfoot>` — direct children must be `<tr>`, `<script>`,
 * or `<template>`.
 */
export const tableBodyContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'table-row', match: isTag('tr', ...METADATA_TAGS) }],
}

/**
 * `<tr>` — direct children must be `<td>`, `<th>`, `<script>`, or `<template>`.
 */
export const tableRowContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'table-cell', match: isTag('td', 'th', ...METADATA_TAGS) }],
}

/**
 * `<colgroup>` — direct children must be `<col>` or `<template>`.
 */
export const colgroupContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'column', match: isTag('col', 'template') }],
}

/**
 * `<dl>` — direct children must be `<dt>`, `<dd>`, `<div>` (as group wrapper),
 * `<script>`, or `<template>`.
 */
export const dlContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'term', match: isTag('dt') },
    { name: 'description', match: isTag('dd') },
    { name: 'group', match: isTag('div') },
    metadata(),
  ],
}

/**
 * `<select>` — direct children must be `<option>`, `<optgroup>`, `<hr>`, `<script>`,
 * or `<template>`.
 */
export const selectContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'option', match: isTag('option', 'optgroup', 'hr', ...METADATA_TAGS) }],
}

/**
 * `<optgroup>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
export const optgroupContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'option', match: isTag('option', ...METADATA_TAGS) }],
}

/**
 * `<picture>` — any number of `<source>` elements followed by exactly one `<img>`.
 */
export const pictureContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'source', match: isTag('source', ...METADATA_TAGS) },
    { name: 'image', match: isTag('img'), cardinality: { min: 1, max: 1 } },
  ],
}

/**
 * `<figure>` — at most one `<figcaption>` (first or last); any other flow content
 * is permitted. The `content` rule acts as an open catch-all so non-figcaption
 * children — including component children — are not flagged as unexpected.
 */
export const figureContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'caption', match: isTag('figcaption'), cardinality: { max: 1 } },
    { name: 'content', match: isFlowContent('figcaption') },
  ],
}

/**
 * `<details>` — at most one `<summary>` and it must be the first child; any other
 * flow content is permitted.
 */
export const detailsContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'summary', match: isTag('summary'), cardinality: { max: 1 }, position: 'first' },
    { name: 'content', match: isFlowContent('summary') },
  ],
}

/**
 * `<fieldset>` — at most one `<legend>` and it must be the first child; any other
 * flow content is permitted.
 */
export const fieldsetContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'legend', match: isTag('legend'), cardinality: { max: 1 }, position: 'first' },
    { name: 'content', match: isFlowContent('legend') },
  ],
}

// ─── Additional contracts ─────────────────────────────────────────────────────

/**
 * <menu> — same content model as <ul>/<ol>.
 */
export const menuContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'menu-item', match: isTag('li', ...METADATA_TAGS) }],
}

/**
 * <datalist> — direct children must be <option>, <script>, or <template>.
 */
export const datalistContract: EnforcementOptions = {
  strict: 'warn',
  children: [{ name: 'option', match: isTag('option', ...METADATA_TAGS) }],
}

/**
 * <audio> — zero or more <source>/<track> elements plus fallback flow content.
 */
export const audioContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'source', match: isTag('source') },
    { name: 'track', match: isTag('track') },
    { name: 'content', match: isFlowContent('source', 'track') },
  ],
}

/**
 * <video> — zero or more <source>/<track> elements plus fallback flow content.
 */
export const videoContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    { name: 'source', match: isTag('source') },
    { name: 'track', match: isTag('track') },
    { name: 'content', match: isFlowContent('source', 'track') },
  ],
}

/**
 * <head> — metadata content only.
 */
export const headContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    {
      name: 'metadata',
      match: isTag('base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title'),
    },
  ],
}

/**
 * <html> — one <head> and one <body>.
 */
export const htmlContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    {
      name: 'head',
      match: isTag('head'),
      cardinality: { min: 1, max: 1 },
      position: 'first',
    },
    {
      name: 'body',
      match: isTag('body'),
      cardinality: { min: 1, max: 1 },
    },
  ],
}

export const buttonContract: EnforcementOptions = {
  strict: 'warn',
  children: [
    {
      name: 'interactive-content',
      match: isTag('a', 'button', 'input', 'select', 'textarea', 'details'),
    },
  ],
}

// ─── Landmark role contract ───────────────────────────────────────────────────

// article, aside, footer, header, main, nav all have unconditional landmark roles.
// section and form are excluded: their landmark role is conditional on having an
// accessible name, so enforcement here would fire incorrectly on unlabelled usage.
const LANDMARK_TAGS = new Set(['article', 'aside', 'footer', 'header', 'main', 'nav'])

const removeLandmarkRoleOverride: AriaFix = {
  kind: 'removeRole',
  apply: ({ props }) => {
    if (!('role' in props)) return { applied: false, next: props }
    const { role: _r, ...rest } = props
    return { applied: true, next: rest, previous: props }
  },
}

function landmarkRoleRule({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
  if (!LANDMARK_TAGS.has(tag) || !implicitRole) return []
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
export const landmarkContract: EnforcementOptions = {
  strict: 'warn',
  aria: [landmarkRoleRule],
}

// ─── Convenience map ──────────────────────────────────────────────────────────

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
  article: landmarkContract,
  aside: landmarkContract,
  footer: landmarkContract,
  header: landmarkContract,
  main: landmarkContract,
  nav: landmarkContract,
  ul: listContract,
  ol: listContract,
  menu: menuContract,
  datalist: datalistContract,
  audio: audioContract,
  video: videoContract,
  table: tableContract,
  thead: tableBodyContract,
  tbody: tableBodyContract,
  tfoot: tableBodyContract,
  tr: tableRowContract,
  colgroup: colgroupContract,
  dl: dlContract,
  select: selectContract,
  optgroup: optgroupContract,
  picture: pictureContract,
  figure: figureContract,
  details: detailsContract,
  fieldset: fieldsetContract,
  head: headContract,
  html: htmlContract,
}
