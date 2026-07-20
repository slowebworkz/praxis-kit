import type { HtmlElementSpec } from '../types'
import { IMG_NAMED_ROLES } from '../roles/img'

// `img`'s roles aren't keyed by an enum value the way `input`'s are — they're keyed by whether
// `alt` is the empty string (decorative image, no explicit role permitted) or not (named/unnamed
// image, large permitted set). A `byProp` lookup table can't express "is this prop exactly the
// empty string," so this is the `dynamic` policy kind.
export const imgElementSpec: HtmlElementSpec = {
  tag: 'img',
  allowedRoles: {
    kind: 'dynamic',
    resolve: ({ props }) => (props.alt === '' ? [] : IMG_NAMED_ROLES),
  },
}
