import { isDefined, isString } from '@praxis-kit/guards'
import type {
  AriaReferenceAttribute,
  AriaReferenceElement,
  AriaRelationshipDiagnostic,
  AriaUnresolvedLookup,
  UnresolvedReferenceCode,
} from './types'

/** Attributes whose values are ID references checked by the reference validators. */
export const REFERENCE_ATTRIBUTES: readonly AriaReferenceAttribute[] = [
  'aria-labelledby',
  'aria-controls',
  'aria-activedescendant',
]

const roleSet = (...roles: string[]): ReadonlySet<string> => new Set(roles)

export const TREE_OWNER_ROLES = roleSet('tree', 'treeitem', 'group')
export const TREEITEM_ROLES = roleSet('treeitem')
export const TREE_ITEM_CHILD_ROLES = roleSet('treeitem', 'group')
export const GRID_ROLES = roleSet('grid', 'treegrid')
export const GRID_ARIA_OWNS_ROLES = roleSet('grid', 'treegrid', 'rowgroup', 'row')
export const GRID_CELL_ROLES = roleSet('gridcell', 'rowheader', 'columnheader')
export const MENU_OWNER_ROLES = roleSet('menu', 'menubar')
export const MENU_ITEM_ROLES = roleSet('menuitem', 'menuitemcheckbox', 'menuitemradio')
export const COMBOBOX_POPUP_ROLES = roleSet('listbox', 'tree', 'grid', 'dialog')

/** The element's role: the top-level `role` wins over `props.role`. */
export function roleOf(element: AriaReferenceElement): unknown {
  return element.role ?? element.props?.role
}

export function hasRole(element: AriaReferenceElement, roles: ReadonlySet<string>): boolean {
  const role = roleOf(element)
  return isString(role) && roles.has(role)
}

/** Whether `props` has its own `name` property, regardless of its value. */
export function hasProp(element: AriaReferenceElement, name: string): boolean {
  return isDefined(element.props) && Object.hasOwn(element.props, name)
}

/**
 * The element's non-empty string id, for diagnostics. A top-level `id` that is `null` or
 * `undefined` falls back to `props.id`; the lookup index instead falls back whenever the
 * top-level `id` is not a string.
 */
export function idOf(element: AriaReferenceElement): string | undefined {
  const id = element.id ?? element.props?.id
  return isString(id) && id.length > 0 ? id : undefined
}

type WithTargetId = { readonly targetId: string }
type WithOptionalTargetId = { readonly targetId?: string }

/** Builds a relationship diagnostic. `targetId` is omitted when falsy. */
export function warn<Code extends string>(
  code: Code,
  sourceIndex: number,
  message: string,
): AriaRelationshipDiagnostic<Code>
export function warn<Code extends string>(
  code: Code,
  sourceIndex: number,
  message: string,
  targetId: string,
): AriaRelationshipDiagnostic<Code, WithTargetId>
export function warn<Code extends string>(
  code: Code,
  sourceIndex: number,
  message: string,
  targetId: string | undefined,
): AriaRelationshipDiagnostic<Code, WithOptionalTargetId>
export function warn(
  code: string,
  sourceIndex: number,
  message: string,
  targetId?: string,
): AriaRelationshipDiagnostic<string, WithOptionalTargetId> {
  return {
    valid: false,
    severity: 'warning',
    code,
    sourceIndex,
    ...(targetId ? { targetId } : {}),
    message,
  }
}

/**
 * Code and message for a missing or ambiguous ID reference. `subject` names the reference in the
 * message, e.g. `aria-controls` or `role="combobox" aria-controls`.
 */
export function unresolvedReference(
  target: AriaUnresolvedLookup,
  subject: string,
): { readonly code: UnresolvedReferenceCode; readonly message: string } {
  return target.status === 'missing'
    ? { code: 'missing-target', message: `${subject} references missing id "${target.id}".` }
    : {
        code: 'ambiguous-target',
        message: `${subject} references id "${target.id}", which is not unique.`,
      }
}
