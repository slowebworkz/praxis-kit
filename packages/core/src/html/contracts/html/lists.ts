import { isTag } from '@praxis-kit/primitive'
import { METADATA_TAGS } from '../categories'
import { closedContract, metadata } from '../helpers'

/**
 * `<ul>`, `<ol>`, `<menu>` — direct children must be `<li>`, `<script>`, or `<template>`.
 */
export const listContract = closedContract([
  { name: 'list-item', match: isTag('li', ...METADATA_TAGS) },
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
