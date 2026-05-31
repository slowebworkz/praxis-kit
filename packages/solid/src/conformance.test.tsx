// @vitest-environment jsdom
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { Component } from 'solid-js'
import { conformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { AnyRecord } from '@praxis-ui/core'
import type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceRef,
} from '@praxis-ui/adapter-utils/testing'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

type SolidConformanceComponent = Component<UnknownProps> & { displayName?: string }

function toSolidElement(c: ChildSpec): unknown {
  if ('component' in c) {
    const Ch = c.component as SolidConformanceComponent
    return <Ch {...((c.props ?? {}) as UnknownProps)}>{(c.children ?? []).map(toSolidElement)}</Ch>
  }
  return (
    <Dynamic component={c.tag} {...((c.props ?? {}) as UnknownProps)}>
      {(c.children ?? []).map(toSolidElement)}
    </Dynamic>
  )
}

function isRefObject(v: unknown): v is ConformanceRef {
  return v !== null && typeof v === 'object' && 'current' in v
}

function normalizeProps(props: AnyRecord): UnknownProps {
  const out = { ...props }
  // Solid uses callback refs; convert { current } objects to a setter callback.
  if ('ref' in out && isRefObject(out.ref)) {
    const r = out.ref
    out.ref = (el: HTMLElement) => {
      r.current = el
    }
  }
  return out as UnknownProps
}

conformanceSuite<SolidConformanceComponent>({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as SolidConformanceComponent,
  render: (component, props = {}, children = []) => {
    // Solid JSX requires a capitalized identifier for component rendering.
    const Comp = component
    // Use signals so rerender() updates props reactively without unmounting.
    const [getProps, setProps] = createSignal<AnyRecord>(props)
    const [getChildren, setChildren] = createSignal<ChildSpec[]>(children)

    const result = solidRender(() => {
      const p = getProps()
      const ch = getChildren()
      return <Comp {...normalizeProps(p)}>{ch.map(toSolidElement)}</Comp>
    })

    return {
      get element() {
        return result.container.firstElementChild as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        setProps(newProps)
        setChildren(newChildren)
      },
      unmount() {
        result.unmount()
      },
    }
  },
  setup: () => {},
  cleanup: () => cleanup(),
  createRef: () => ({ current: null }),
  capabilities: { asChild: false },
})
