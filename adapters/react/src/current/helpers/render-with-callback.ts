import type { AnyRecord } from '@praxis-kit/core'
import type { ReactElement, Ref } from 'react'

export type RenderCallbackProps = AnyRecord & {
  className?: string
  ref?: unknown
}

export type RenderCallback = (props: RenderCallbackProps) => ReactElement

export function renderWithCallback(
  render: RenderCallback,
  domProps: AnyRecord,
  className?: string,
  ref?: Ref<unknown>,
): ReactElement {
  const props: RenderCallbackProps = { ...domProps }
  if (className) props.className = className
  if (ref !== undefined) props.ref = ref
  return render(props)
}
