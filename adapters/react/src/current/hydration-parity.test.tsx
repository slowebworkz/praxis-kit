// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { hydrationParitySuite } from '@praxis-kit/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-utils/testing'
import { parseAttributes, parseNormalizedAttributes } from '@praxis-kit/shared/tests'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { UnknownProps } from '../shared'
import { createContractComponent } from './create-contract-component'

type AnyComp = ComponentType<UnknownProps>

function ssr(comp: unknown, props?: UnknownProps, ...children: ReactNode[]) {
  return renderToStaticMarkup(createElement(comp as AnyComp, props ?? {}, ...children))
}

let container: HTMLDivElement | null = null

async function renderClient(comp: unknown, props?: UnknownProps, ...children: ReactNode[]) {
  container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(createElement(comp as AnyComp, props ?? {}, ...children)))
  const html = container.innerHTML
  await act(async () => root.unmount())
  return html
}

afterEach(() => {
  if (container?.parentNode) {
    container.parentNode.removeChild(container)
    container = null
  }
})

describe('SSR/CSR hydration parity — class and tag attributes', () => {
  it('base class matches between server and client render', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-base' },
      enforcement: { diagnostics: silentDiagnostics },
    })

    const serverAttrs = parseNormalizedAttributes(ssr(Box))
    const clientAttrs = parseNormalizedAttributes(await renderClient(Box))

    expect(serverAttrs).toEqual(clientAttrs)
  })

  it('variant class matches between server and client render', async () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { size: { sm: 'box-sm', lg: 'box-lg' } },
        defaults: { size: 'lg' },
      },
      enforcement: { diagnostics: silentDiagnostics },
    })

    const serverAttrs = parseNormalizedAttributes(ssr(Box))
    const clientAttrs = parseNormalizedAttributes(await renderClient(Box))

    expect(serverAttrs).toEqual(clientAttrs)
  })

  it('ARIA strip result matches: redundant role absent on both server and client', async () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { role: 'navigation' } as UnknownProps

    const serverAttrs = parseAttributes(ssr(Nav, props))
    const clientAttrs = parseAttributes(await renderClient(Nav, props))

    expect(serverAttrs).not.toHaveProperty('role')
    expect(clientAttrs).not.toHaveProperty('role')
    expect(serverAttrs).toEqual(clientAttrs)
  })

  it('ARIA strip result matches: invalid aria-* absent on both server and client', async () => {
    const Button = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { 'aria-checked': 'true' } as UnknownProps

    const serverAttrs = parseAttributes(ssr(Button, props))
    const clientAttrs = parseAttributes(await renderClient(Button, props))

    expect(serverAttrs).not.toHaveProperty('aria-checked')
    expect(clientAttrs).not.toHaveProperty('aria-checked')
    expect(serverAttrs).toEqual(clientAttrs)
  })

  it('as prop override: tag and attributes match between server and client', async () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { as: 'section' } as UnknownProps

    const serverHtml = ssr(Nav, props)
    const clientHtml = await renderClient(Nav, props)

    expect(serverHtml).toContain('<section')
    expect(clientHtml).toContain('<section')
    expect(parseNormalizedAttributes(serverHtml)).toEqual(parseNormalizedAttributes(clientHtml))
  })

  it('compound variant class matches between server and client', async () => {
    const Button = createContractComponent({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: {
          size: { sm: 'btn-sm', lg: 'btn-lg' },
          intent: { primary: 'btn-primary', ghost: 'btn-ghost' },
        },
        defaults: { size: 'sm', intent: 'primary' },
        compounds: [{ size: 'lg', intent: 'ghost', class: 'btn-lg-ghost' }],
      },
      enforcement: { diagnostics: silentDiagnostics },
    })
    const props = { size: 'lg', intent: 'ghost' } as UnknownProps

    const serverAttrs = parseNormalizedAttributes(ssr(Button, props))
    const clientAttrs = parseNormalizedAttributes(await renderClient(Button, props))

    expect(serverAttrs).toEqual(clientAttrs)
    expect(serverAttrs['class']).toContain('btn-lg-ghost')
  })
})

let hydContainer: HTMLElement | null = null

hydrationParitySuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ComponentType<UnknownProps> & {
      displayName?: string
    },
  renderToString: (component, props = {}) => {
    const { class: cls, ...rest } = props
    const normalized = cls !== undefined ? { ...rest, className: cls } : rest
    return renderToStaticMarkup(
      createElement(component as ComponentType<UnknownProps>, normalized as UnknownProps),
    )
  },
  renderToDOM: async (component, props = {}) => {
    hydContainer = document.createElement('div')
    document.body.appendChild(hydContainer)
    const root = createRoot(hydContainer)
    const { class: cls, ...rest } = props
    const normalized = cls !== undefined ? { ...rest, className: cls } : rest
    await act(async () =>
      root.render(
        createElement(component as ComponentType<UnknownProps>, normalized as UnknownProps),
      ),
    )
    return hydContainer.firstElementChild as HTMLElement
  },
  setup: () => {},
  cleanup: () => {
    if (hydContainer?.parentNode) hydContainer.parentNode.removeChild(hydContainer)
    hydContainer = null
  },
})
