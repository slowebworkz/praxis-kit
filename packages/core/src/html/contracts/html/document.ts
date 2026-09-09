import { isTag } from '@praxis-kit/primitive'
import { closedContract, contract } from '../helpers'

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
