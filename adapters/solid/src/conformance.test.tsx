// @vitest-environment jsdom
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import { Dynamic } from 'solid-js/web'
import type { Component } from 'solid-js'
import {
  conformanceSuite,
  conformanceA11ySuite,
  conformancePerformanceSuite,
  conformanceIsolationSuite,
} from '@praxis-kit/adapter-utils/testing'
import type { AnyRecord } from '@praxis-kit/core'
import type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceAdapter,
  ConformanceRef,
} from '@praxis-kit/adapter-utils/testing'
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

const adapter: ConformanceAdapter<SolidConformanceComponent> = {
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as SolidConformanceComponent,
  render: (component, props = {}, children = []) => {
    // Solid JSX requires a capitalized identifier for component rendering.
    const Comp = component
    let result = solidRender(() => (
      <Comp {...normalizeProps(props)}>{children.map(toSolidElement)}</Comp>
    ))
    return {
      get element() {
        return result.container.firstElementChild as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        // @solidjs/testing-library has no rerender() API; unmount+remount
        // produces correct DOM state for conformance assertions.
        result.unmount()
        result = solidRender(() => (
          <Comp {...normalizeProps(newProps)}>{newChildren.map(toSolidElement)}</Comp>
        ))
      },
      unmount() {
        result.unmount()
      },
    }
  },
  setup: () => {},
  cleanup: () => cleanup(),
  createRef: () => ({ current: null }),
  capabilities: { asChild: false, dynamicChildRules: true },
}

conformanceSuite(adapter)
conformanceA11ySuite(adapter)

conformancePerformanceSuite(adapter)
conformanceIsolationSuite(adapter)
