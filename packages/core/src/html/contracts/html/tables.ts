import { isTag } from '@praxis-kit/primitive'
import { METADATA_TAGS } from '../categories'
import { closedContract, firstOptional } from '../helpers'

/**
 * `<table>` — permits the HTML table sectioning elements as direct children.
 *
 * `<caption>` is optional and must be first. `<thead>` and `<tfoot>` may each
 * appear at most once.
 *
 * Relative ordering of the remaining sections is not currently validated.
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
 * `<thead>`, `<tbody>`, and `<tfoot>` — permit table rows as direct children.
 */
export const tableBodyContract = closedContract([
  { name: 'table-row', match: isTag('tr', ...METADATA_TAGS) },
])

/**
 * `<tr>` — permits table cells as direct children.
 */
export const tableRowContract = closedContract([
  { name: 'table-cell', match: isTag('td', 'th', ...METADATA_TAGS) },
])

/**
 * `<colgroup>` — permits column definitions as direct children.
 */
export const colgroupContract = closedContract([
  { name: 'column', match: isTag('col', 'template') },
])
