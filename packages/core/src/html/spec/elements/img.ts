import { isNullish } from '@praxis-kit/primitive'
import type { HtmlElementSpec } from '../types'
import { IMG_DECORATIVE_ROLES, IMG_NAMED_ROLES } from '../roles/img'

// `img`'s roles are keyed by the state of `alt`, not an enum value:
//  - `alt` non-empty → named image, the large `IMG_NAMED_ROLES` set.
//  - `alt=""` → decorative image, implicit `none`/`presentation`, no *other* explicit role.
//  - `alt` absent → ARIA-in-HTML gives "no corresponding role" and restricts explicit roles to
//    `none`/`presentation` (audit finding F6). Missing `alt` is itself invalid HTML, so this is a
//    narrow case, but `<img role="button">` with no `alt` should still be flagged.
// A `byProp` lookup table can't express "is this prop exactly the empty string / absent", so this
// is the `dynamic` policy kind.
export const imgElementSpec: HtmlElementSpec<'img'> = {
  tag: 'img',
  allowedRoles: {
    kind: 'dynamic',
    resolve: ({ props }) => {
      if (isNullish(props.alt)) return IMG_DECORATIVE_ROLES
      return props.alt === '' ? [] : IMG_NAMED_ROLES
    },
  },
}
