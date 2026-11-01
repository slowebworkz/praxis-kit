/**
 * `onElement` coverage for Lit. The behaviour — the real element reaches the hook, getProps()
 * tracks current props without re-registering, the returned cleanup fires — is the shared
 * `onElementSuite`; this file supplies Lit's mounting. Lit's generated class always registers
 * under a consumer-chosen hyphenated custom-element name (never literally `dialog`), so this
 * uses a plain custom tag: the element handed to the hook is the custom-element instance itself.
 * "Unmount" is disconnecting it from the document, and a "prop" is a string attribute — the
 * shape of current prop Lit's getProps() supports, which reads attributes plus declared
 * reactive properties.
 */
import { afterEach } from 'vitest'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import { createContractComponent } from './create-contract-component'

type LitEl = HTMLElement & { updateComplete: Promise<boolean> }

let sequence = 0

function define(ctor: CustomElementConstructor): string {
  const name = `pk-on-element-${++sequence}`
  customElements.define(name, ctor)
  return name
}

afterEach(() => {
  document.body.innerHTML = ''
})

onElementSuite({
  mount: async (hook, label) => {
    const Widget = createContractComponent({ tag: 'div', name: 'Widget', onElement: hook })
    const el = document.createElement(define(Widget))
    if (label !== undefined) el.setAttribute('label', label)
    document.body.appendChild(el)
    await (el as unknown as LitEl).updateComplete

    return {
      element: el,
      setLabel: async (next) => {
        el.setAttribute('label', next)
        await (el as unknown as LitEl).updateComplete
      },
      unmount: () => {
        document.body.removeChild(el)
      },
    }
  },
  mountPlain: async () => {
    const Plain = createContractComponent({ tag: 'div', name: 'PlainOnElement' })
    const el = document.createElement(define(Plain))
    document.body.appendChild(el)
    await (el as unknown as LitEl).updateComplete
  },
})
