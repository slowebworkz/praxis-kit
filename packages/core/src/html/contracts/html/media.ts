import { isTag } from '@praxis-kit/primitive'
import { METADATA_TAGS } from '../categories'
import { closedContract, contract, isOpenContent, metadata } from '../helpers'

/**
 * `<picture>` — permits zero or more `<source>` elements followed by a single
 * `<img>` fallback.
 *
 * `<img>` must be the final child.
 */
export const pictureContract = closedContract([
  { name: 'source', match: isTag('source', ...METADATA_TAGS) },
  { name: 'image', match: isTag('img'), cardinality: { min: 1, max: 1 }, position: 'last' },
])

/**
 * `<figure>` — permits at most one `<figcaption>` and arbitrary flow content.
 *
 * The `<figcaption>` may appear as either the first or last child.
 */
export const figureContract = contract([
  { name: 'caption', match: isTag('figcaption'), cardinality: { max: 1 } },
  { name: 'content', match: isOpenContent('figcaption') },
])

/**
 * `<object>` — permits `<param>` elements followed by transparent fallback
 * content.
 *
 * Relative ordering is not currently validated.
 */
export const objectContract = contract([
  { name: 'param', match: isTag('param') },
  { name: 'content', match: isOpenContent('param') },
])

/**
 * `<audio>` and `<video>` — permit media source definitions, timed text tracks,
 * metadata, and fallback content.
 */
export const mediaContract = contract([
  { name: 'source', match: isTag('source') },
  { name: 'track', match: isTag('track') },
  metadata(),
  { name: 'content', match: isOpenContent('source', 'track', ...METADATA_TAGS) },
])

export const audioContract = mediaContract
export const videoContract = mediaContract
