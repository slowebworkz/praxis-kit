import type { ChildRuleInput, EnforcementOptions } from '../types'
import type { HtmlContractMap } from '@praxis-kit/contract'
import { getTag, isTag, isObject } from '@praxis-kit/primitive'
import { landmarkNameAdvisory, landmarkRoleRule, requireAccessibleName } from './aria-rules'
import { warnDiagnostics } from '@praxis-kit/diagnostics'

// Matches any element whose resolved semantic tag is not in the blocked set.
// Uses getTag() so Praxis components resolve through COMPONENT_DEFAULT_TAG
// exactly as isTag() does, preventing semantic components like Figure.Caption
// from being treated as generic open content.
function isOpenContent(...blockedTags: string[]): (child: unknown) => child is { type: unknown } {
  const set = new Set(blockedTags)
  return (child: unknown): child is { type: unknown } => {
    if (!isObject(child) || !('type' in child)) return false
    const tag = getTag(child)
    return tag === undefined || !set.has(tag)
  }
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

function contract(
  children: readonly ChildRuleInput[],
  options?: Pick<EnforcementOptions, 'exclusiveChildren' | 'allowText'>,
): EnforcementOptions {
  return { diagnostics: warnDiagnostics, children, ...options }
}

// Most built-in contracts below enumerate the complete valid content model for their
// tag, so they close the set — anything not listed is rejected, matching the HTML spec's
// content model rather than the library's open-by-default authoring convenience.
function closedContract(children: readonly ChildRuleInput[]): EnforcementOptions {
  return contract(children, { exclusiveChildren: true })
}

function ariaContract(aria: NonNullable<EnforcementOptions['aria']>): EnforcementOptions {
  return { diagnostics: warnDiagnostics, aria }
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

// Raw text (<script>, <style>) and escapable raw text (<textarea>, <title>) per HTML5,
// plus <option> whose content model is character data only.
const TEXT_ONLY_TAGS = ['option', 'script', 'style', 'textarea', 'title'] as const

// section and form are excluded: their landmark role is conditional on having an
// accessible name, so enforcement here would fire incorrectly on unlabelled usage.
const LANDMARK_TAGS = ['article', 'aside', 'footer', 'header', 'main', 'nav'] as const

// ─── Contracts ────────────────────────────────────────────────────────────────

/**
 * `<ul>`, `<ol>`, `<menu>` — direct children must be `<li>`, `<script>`, or `<template>`.
 */
export const listContract = closedContract([
  { name: 'list-item', match: isTag('li', ...METADATA_TAGS) },
])

/**
 * `<table>` — valid direct children per HTML5 content model.
 * `<caption>` is optional and must be first; `<thead>` and `<tfoot>` are at most one each.
 * Section ordering (caption → colgroup → thead → tbody → tfoot) is not enforced: the
 * engine only supports `position: 'first' | 'last'`, not inter-rule sequence constraints.
 */
export const tableContract = closedContract([
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
export const tableBodyContract = closedContract([
  { name: 'table-row', match: isTag('tr', ...METADATA_TAGS) },
])

/**
 * `<tr>` — direct children must be `<td>`, `<th>`, `<script>`, or `<template>`.
 */
export const tableRowContract = closedContract([
  { name: 'table-cell', match: isTag('td', 'th', ...METADATA_TAGS) },
])

/**
 * `<colgroup>` — direct children must be `<col>` or `<template>`.
 */
export const colgroupContract = closedContract([
  { name: 'column', match: isTag('col', 'template') },
])

/**
 * `<dl>` — direct children must be `<dt>`, `<dd>`, `<div>` (as group wrapper),
 * `<script>`, or `<template>`.
 */
export const dlContract = closedContract([
  { name: 'term', match: isTag('dt') },
  { name: 'description', match: isTag('dd') },
  { name: 'group', match: isTag('div') },
  metadata(),
])

/**
 * `<select>` — direct children must be `<option>`, `<optgroup>`, `<hr>`, `<script>`,
 * or `<template>`.
 */
export const selectContract = closedContract([
  { name: 'option', match: isTag('option', 'optgroup', 'hr', ...METADATA_TAGS) },
])

/**
 * `<optgroup>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
export const optgroupContract = closedContract([
  { name: 'option', match: isTag('option', ...METADATA_TAGS) },
])

/**
 * `<datalist>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
export const datalistContract = closedContract([
  { name: 'option', match: isTag('option', ...METADATA_TAGS) },
])

/**
 * `<picture>` — any number of `<source>` elements followed by exactly one `<img>`.
 * `<img>` must be last; `<source>` elements after `<img>` are ignored by browsers.
 */
export const pictureContract = closedContract([
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
export const headContract = closedContract([
  {
    name: 'metadata',
    match: isTag('base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title'),
  },
])

/**
 * `<html>` — one `<head>` and one `<body>`.
 */
export const htmlContract = closedContract([
  { name: 'head', match: isTag('head'), cardinality: { min: 1, max: 1 }, position: 'first' },
  { name: 'body', match: isTag('body'), cardinality: { min: 1, max: 1 } },
])

/**
 * Void elements — the HTML spec forbids any children, including text.
 */
export const voidContract = contract([], { exclusiveChildren: true, allowText: false })

/**
 * Raw text (`<script>`, `<style>`), escapable raw text (`<textarea>`, `<title>`), and
 * `<option>` — only text nodes (strings or numbers) are permitted as children. No
 * explicit rule is needed: `exclusiveChildren` rejects every element (nothing matches
 * the empty rule list) while `allowText` stays at its default `true`.
 */
export const textOnlyContract = contract([], { exclusiveChildren: true })

// ─── Landmark role contract ───────────────────────────────────────────────────

/**
 * Elements with an unconditional landmark role (`<article>`, `<aside>`, `<footer>`,
 * `<header>`, `<main>`, `<nav>`).
 *
 * - `role="<implicit>"` → warning: redundant, removed (built-in engine behaviour).
 * - `role="<anything else>"` → error: overrides the fixed landmark, removed.
 * - `<nav>` and `<aside>` without an accessible name → warning (commonly multiplied).
 */
export const landmarkContract = ariaContract([landmarkRoleRule, landmarkNameAdvisory])

/**
 * `<dialog>` — must have an accessible name (aria-label or aria-labelledby).
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * Without a name, assistive technology cannot identify the dialog in the page outline
 * or when focus moves into it.
 */
export const dialogContract = ariaContract([requireAccessibleName])

// ─── Widget role contracts ────────────────────────────────────────────────────

/**
 * `role="menu"` — keyboard-navigable pop-up list of actions or functions.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/menu/
 */
export const menuContract = ariaContract([requireAccessibleName])

/**
 * `role="menubar"` — persistent horizontal menu bar of menu items.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 */
export const menubarContract = ariaContract([requireAccessibleName])

/**
 * `role="tree"` — hierarchical list where items can be expanded or collapsed.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 */
export const treeContract = ariaContract([requireAccessibleName])

/**
 * `role="grid"` — composite widget containing rows of cells, similar to a spreadsheet.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 */
export const gridContract = ariaContract([requireAccessibleName])

/**
 * `role="listbox"` — list from which a user may select one or more options.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 */
export const listboxContract = ariaContract([requireAccessibleName])

/**
 * `role="tablist"` — container for a set of tabs that manage tab panels.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export const tablistContract = ariaContract([requireAccessibleName])

/**
 * `role="radiogroup"` — group of radio buttons where only one may be selected at a time.
 * WAI-ARIA 1.2: https://www.w3.org/TR/wai-aria-1.2/#radiogroup
 */
export const radiogroupContract = ariaContract([requireAccessibleName])

// ─── Convenience map ──────────────────────────────────────────────────────────

const CONTRACT_GROUPS = [
  [VOID_TAGS, voidContract],
  [TEXT_ONLY_TAGS, textOnlyContract],
  [LANDMARK_TAGS, landmarkContract],
  [['ul', 'ol', 'menu'], listContract],
  [['audio', 'video'], mediaContract],
  [['thead', 'tbody', 'tfoot'], tableBodyContract],
] as const

export type { HtmlContractMap } from '@praxis-kit/contract'

function contractMap(
  groups: readonly (readonly [readonly string[], EnforcementOptions])[],
): HtmlContractMap {
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
export const htmlContracts: HtmlContractMap = {
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
  dialog: dialogContract,

  head: headContract,
  html: htmlContract,
}

/**
 * Ready-made `EnforcementOptions` objects keyed by WAI-ARIA widget role name.
 *
 * Use when the HTML tag itself does not carry semantic meaning and an explicit
 * `role` attribute provides the widget identity:
 * ```ts
 * const Menu = createContractComponent({ tag: 'ul', enforcement: widgetContracts.menu })
 * // consumer renders: <ul role="menu" aria-label="File">
 * ```
 *
 * Each contract enforces an accessible name (aria-label or aria-labelledby), matching
 * the WAI-ARIA APG requirement for named landmarks and interactive composite widgets.
 */
export const widgetContracts: HtmlContractMap = {
  menu: menuContract,
  menubar: menubarContract,
  tree: treeContract,
  grid: gridContract,
  listbox: listboxContract,
  tablist: tablistContract,
  radiogroup: radiogroupContract,
}
