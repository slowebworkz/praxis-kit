import { P_BLOCKED_TAGS } from '../categories'
import { closedContract, isOpenContent } from '../helpers'

/**
 * `<p>` — permits phrasing content only.
 *
 * Implemented as a pragmatic blocklist of elements that terminate a paragraph.
 */
export const pContract = closedContract([
  { name: 'content', match: isOpenContent(...P_BLOCKED_TAGS) },
])
