import { getTag, isString, isTag } from '@praxis-kit/primitive'
import {
  INTERACTIVE_CONTENT_TAGS,
  LABELABLE_TAGS,
  METADATA_TAGS,
  OTHER_INTERACTIVE_TAGS,
} from '../categories'
import { closedContract, contract, getChildProp, isOpenContent } from '../helpers'
import type { VNodeLike } from '../types'

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
 * `<button>` — must not directly contain interactive content (`<a>`, another `<button>`,
 * `<input>`, `<select>`, `<textarea>`, or `<label>`) per the HTML5 spec.
 */
export const buttonContract = closedContract([
  { name: 'content', match: isOpenContent(...INTERACTIVE_CONTENT_TAGS) },
])

/**
 * `<a>` — same interactive-content restriction as `<button>`: must not directly contain
 * `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`, or `<label>`.
 */
export const anchorContract = closedContract([
  { name: 'content', match: isOpenContent(...INTERACTIVE_CONTENT_TAGS) },
])

const labelableTagMatch = isTag(...LABELABLE_TAGS)

// Same tag set as `LABELABLE_TAGS`, but rejects `input[type="hidden"]`: a hidden input
// carries no visible control for a label's click-to-focus/accname association to target.
function isLabelableControl(child: unknown): child is VNodeLike {
  if (!labelableTagMatch(child)) return false
  if (getTag(child) !== 'input') return true
  const type = getChildProp(child, 'type')
  return !isString(type) || type !== 'hidden'
}

/**
 * `<label>` — at most one labelable form control descendant (`<button>`, `<input>`
 * excluding `type="hidden"`, `<meter>`, `<output>`, `<progress>`, `<select>`, `<textarea>`);
 * a nested `<label>` is rejected outright, as is any other interactive content (`<a>`,
 * `<details>`, `<embed>`, `<iframe>`) that isn't the labeled control; any other phrasing
 * content is permitted.
 */
export const labelContract = contract([
  { name: 'control', match: isLabelableControl, cardinality: { max: 1 } },
  { name: 'nested-label', match: isTag('label'), cardinality: { max: 0 } },
  {
    name: 'other-interactive-content',
    match: isTag(...OTHER_INTERACTIVE_TAGS),
    cardinality: { max: 0 },
  },
])
