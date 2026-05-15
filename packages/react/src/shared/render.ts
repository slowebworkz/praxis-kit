import { createElement } from 'react'
import { jsx } from 'react/jsx-runtime'
import type { ComponentType, ReactElement, Ref } from 'react'
import type { AnyRecord, ClassName, ElementType as CoreElementType } from '@polymorphic-ui/core'
import { SlotValidator } from './slot/slot-validator'
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

  const name = runtime.options.displayName ?? 'PolymorphicComponent'
  const validator = new SlotValidator(name, runtime.options.strict)

  const tag = runtime.resolveTag(as)
  const mergedProps = runtime.resolveProps(rest)
  const resolvedClass = runtime.resolveClasses(tag, mergedProps, className, variantKey)
  const domProps = applyFilter(mergedProps, filterProps, runtime.options.variantKeys)

  if (as !== undefined && asChild) {
    validator.assertExclusive()
    // Non-throw modes: warned and fell through — render normally as a fallback.
  } else if (asChild) {
    const kids = normalizeChildren(children)

    if (Array.isArray(children) && children.length > kids.length) {
      validator.warnDiscardedChildren(children.length - kids.length)
    }

    if (kids.length !== 1) {
      validator.assertSingleChild(kids.length)
      // Non-throw modes: warned and fell through — render normally as a fallback.
    } else {
      return jsx(slotComponent, {
        ...domProps,
        className: resolvedClass,
        ref,
        children: kids[0]!,
      }) as ReactElement
    }
  }

  const elementProps: AnyRecord = { ...domProps, className: resolvedClass, ref }
  if (children !== undefined) elementProps['children'] = children
  return createElement(tag, elementProps)
}
