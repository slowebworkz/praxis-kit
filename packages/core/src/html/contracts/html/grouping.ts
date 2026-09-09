import { firstChildContract } from '../helpers'

/**
 * `<details>` — permits an optional leading `<summary>` followed by flow content.
 */

export const detailsContract = firstChildContract('summary', 'summary')

/**
 * `<fieldset>` — permits an optional leading `<legend>` followed by flow content.
 */
export const fieldsetContract = firstChildContract('legend', 'legend')
