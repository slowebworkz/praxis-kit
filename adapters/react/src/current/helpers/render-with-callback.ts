import type { ReactElement, Ref } from 'react'

export interface RenderCallbackProps {
  className?: string
  ref?: unknown
}

export type RenderCallback = (props: RenderCallbackProps) => ReactElement

export function renderWithCallback(
  render: RenderCallback,
  className?: string,
  ref?: Ref<unknown>,
): ReactElement {
  const props: RenderCallbackProps = {}
  if (className) props.className = className
  if (ref !== undefined) props.ref = ref
  return render(props)
}
