import type { HtmlElementSpec } from '../types'
import { ALLOWED_TABLE_ROLES } from '../roles/table'

// `table`'s allowed roles never vary with props — a `fixed` policy, unlike input/img's
// prop-conditional ones. Its content-model (permitted children) is a separate, richer concern
// already modeled in `../../contracts.ts` (`tableContract`, `tableBodyContract`,
// `tableRowContract`) and isn't represented here yet.
export const tableElementSpec: HtmlElementSpec = {
  tag: 'table',
  allowedRoles: { kind: 'fixed', roles: ALLOWED_TABLE_ROLES },
}
