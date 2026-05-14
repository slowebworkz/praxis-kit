import { createElement } from 'react'
import type { ComponentType, ReactElement, Ref } from 'react'
import type { AnyRecord, ClassName, ElementType as CoreElementType } from '@polymorphic-ui/core'
import { composeSlot } from './compose-slot'
import type { AnyRuntime } from './types'

function applyFilter(
  props: AnyRecord,
  filterProps: ((key: string, variantKeys: ReadonlySet<string>) => boolean) | undefined,
  variantKeys: ReadonlySet<string>,
): AnyRecord {
  if (!filterProps) return props
  const out: AnyRecord = {}
  for (const [k, v] of Object.entries(props)) {
    if (!filterProps(k, variantKeys)) out[k] = v
  }
  return out
}

type KnownProps = {
  as?: CoreElementType
  asChild?: boolean
  children?: unknown
  className?: ClassName
  variantKey?: string
  [key: string]: unknown
}

export interface RenderInput {
  runtime: AnyRuntime
  props: AnyRecord
  ref: Ref<unknown> | null
  slotComponent: ComponentType<AnyRecord>
  normalizeChildren: (children: unknown) => ReactElement[]
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}

export function render({
  runtime,
  props,
  ref,
  slotComponent,
  normalizeChildren,
  filterProps,
}: RenderInput): ReactElement {
  const { as, asChild, children, className, variantKey, ...rest } = props as KnownProps

  if (as !== undefined && asChild) {
    throw new Error(
      `${runtime.options.displayName ?? 'PolymorphicComponent'}: "as" and "asChild" are mutually exclusive`,
    )
  }

  const tag = runtime.resolveTag(as)
  const mergedProps = runtime.resolveProps(rest)
  const resolvedClass = runtime.resolveClasses(tag, mergedProps, className, variantKey)
  const domProps = applyFilter(mergedProps, filterProps, runtime.options.variantKeys)

  if (asChild) {
    const kids = normalizeChildren(children)
    if (kids.length !== 1) {
      throw new Error(
        `${runtime.options.displayName ?? 'PolymorphicComponent'}: asChild requires exactly one React element child, got ${kids.length}`,
      )
    }
    return composeSlot(slotComponent, kids[0], { ...domProps, className: resolvedClass }, ref)
  }

  const elementProps: AnyRecord = { ...domProps, className: resolvedClass, ref }
  if (children !== undefined) elementProps['children'] = children
  return createElement(tag, elementProps)
}
