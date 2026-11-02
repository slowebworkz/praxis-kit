/**
 * `onElement` coverage for the framework-free web adapter. The behaviour — the real element
 * reaches the hook, getProps() tracks current props without re-registering, the returned cleanup
 * fires — is the shared `onElementSuite`; this file supplies the mounting. The registered
 * custom-element tag is always the consumer-chosen hyphenated name (never literally `dialog`), so
 * this uses a plain custom tag and the element handed to the hook is the instance itself.
 * "Unmount" is disconnecting it from the document, and a "prop" is a string attribute — the
 * shape of current prop this adapter's getProps() supports, since arbitrary function-valued
 * instance properties never enter its prop pipeline.
 */
import { afterEach } from 'vitest'
import { onElementSuite } from '@praxis-kit/adapter-testing'
import { createContractComponent } from './create-contract-component'

let sequence = 0

function define(ctor: CustomElementConstructor): string {
  const name = `pk-web-on-element-${++sequence}`
  customElements.define(name, ctor)
  return name
}

afterEach(() => {
  document.body.innerHTML = ''
})

onElementSuite({
  mount: (hook, label) => {
    const Widget = createContractComponent({ tag: 'div', name: 'Widget', onElement: hook })
    const el = document.createElement(define(Widget))
    if (label !== undefined) el.setAttribute('label', label)
    document.body.appendChild(el)

    return {
      element: el,
      setLabel: (next) => {
        el.setAttribute('label', next)
      },
      unmount: () => {
        document.body.removeChild(el)
      },
    }
  },
  mountPlain: () => {
    const Plain = createContractComponent({ tag: 'div', name: 'PlainOnElement' })
    document.body.appendChild(document.createElement(define(Plain)))
  },
})
