// @vitest-environment jsdom
//
// Known limitations vs other adapters (documented, not bugs):
//
//   1. Tag rendering: custom elements have a fixed tag set at define()-time.
//      The `options.tag` drives ARIA inference only — the rendered element tag
//      is always the custom element name. Tests "renders default tag",
//      "respects a custom tag option", "renders a different tag via as prop",
//      and "switches rendered tag on rerender with a new as prop" will fail.
//
//   2. Variant key stripping: Lit's reactive property system keeps variant
//      attributes on the host as DOM attributes. In React/Vue they never reach
//      the DOM. Tests "strips variant keys before DOM forwarding" and
//      "custom filterProps strips matching keys" will fail.
//
//   3. asChild: disabled via capabilities.asChild: false (Light DOM, no JSX slot).

import { conformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceAdapter,
  ConformanceFactoryOptions,
} from '@praxis-ui/adapter-utils/testing'
import { createContractComponent } from './create-contract-component'
import type { LitConformanceComponent, LitConformanceEl } from './types/index'
import type { AnyRecord } from '@praxis-ui/core'

// ─── Helpers ─────────────────────────────────────────────────────────────────

let counter = 0
const uniqueTag = () => `praxis-conf-${counter++}`

// React-style event prop → native event name.
const EVENT_MAP: Record<string, string> = {
  onClick: 'click',
  onFocus: 'focus',
  onBlur: 'blur',
  onChange: 'change',
  onInput: 'input',
  onKeyDown: 'keydown',
  onKeyUp: 'keyup',
}

type ListenerMap = Map<string, EventListener>

function applyProps(el: HTMLElement, props: AnyRecord, listeners: ListenerMap): void {
  for (const [key, value] of Object.entries(props)) {
    const nativeEvent = EVENT_MAP[key]
    if (nativeEvent) {
      // Remove old listener for this event before adding the new one.
      const old = listeners.get(nativeEvent)
      if (old) el.removeEventListener(nativeEvent, old)
      const fn = value as EventListener
      el.addEventListener(nativeEvent, fn)
      listeners.set(nativeEvent, fn)
      continue
    }
    if (key === 'className' || key === 'class') {
      // Route through praxis-class so _applyPraxis reads it as the external
      // className input without a circular class → pipeline → class loop.
      el.setAttribute('praxis-class', value as string)
      continue
    }
    if (key === 'variantKey') {
      // Conformance suite passes variantKey in camelCase; the Lit attribute is kebab.
      el.setAttribute('variant-key', value as string)
      continue
    }
    if (key === 'style' && typeof value === 'object' && value !== null) {
      Object.assign(el.style, value)
      continue
    }
    if (value === true) {
      el.setAttribute(key, '')
      continue
    }
    if (value === false || value === null || value === undefined) {
      el.removeAttribute(key)
      continue
    }
    el.setAttribute(key, String(value))
  }
}

function clearStaleProps(el: HTMLElement, prevProps: AnyRecord, nextProps: AnyRecord): void {
  // Remove attributes present in prevProps but absent in nextProps.
  for (const key of Object.keys(prevProps)) {
    if (key in nextProps) continue
    if (EVENT_MAP[key]) continue
    const attr =
      key === 'variantKey'
        ? 'variant-key'
        : key === 'className' || key === 'class'
          ? 'praxis-class'
          : key
    el.removeAttribute(attr)
  }
}

function buildChild(spec: ChildSpec): HTMLElement {
  if ('component' in spec) {
    const comp = spec.component as LitConformanceComponent
    const el = document.createElement(comp.elementName)
    const listeners: ListenerMap = new Map()
    applyProps(el, spec.props ?? {}, listeners)
    for (const c of spec.children ?? []) el.appendChild(buildChild(c))
    return el as HTMLElement
  }
  const el = document.createElement(spec.tag)
  const listeners: ListenerMap = new Map()
  applyProps(el, spec.props ?? {}, listeners)
  for (const c of spec.children ?? []) el.appendChild(buildChild(c))
  return el as HTMLElement
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

let container: HTMLElement

const adapter: ConformanceAdapter<LitConformanceComponent> = {
  capabilities: { asChild: false },

  createComponent(options: ConformanceFactoryOptions): LitConformanceComponent {
    const ElementClass = createContractComponent(options as BareFactoryOptions)
    const elementName = uniqueTag()
    customElements.define(elementName, ElementClass as unknown as CustomElementConstructor)
    return {
      displayName: options.name ?? 'PolymorphicComponent',
      elementName,
    }
  },

  render(component, props = {}, children = []) {
    const el = document.createElement(component.elementName) as unknown as LitConformanceEl
    const elHtml = el as unknown as HTMLElement
    const listeners: ListenerMap = new Map()
    let lastProps = { ...props }

    // Track user-provided children separately so rerender can remove only these
    // and leave Lit's internal template nodes (slot, comment markers) intact.
    const userChildren: Node[] = children.map((c) => buildChild(c))
    for (const c of userChildren) elHtml.appendChild(c)

    container.appendChild(elHtml)
    applyProps(elHtml, props, listeners)

    // performUpdate() forces Lit's microtask-scheduled update to run synchronously.
    el.performUpdate()

    return {
      get element() {
        return container.firstElementChild as HTMLElement
      },
      rerender(newProps = {}, newChildren = []) {
        clearStaleProps(elHtml, lastProps, newProps)
        lastProps = { ...newProps }

        // Remove only the user-provided children — Lit's slot and comment
        // marker nodes must remain or ChildPart tracking breaks.
        for (const c of userChildren) if (c.parentNode) c.parentNode.removeChild(c)
        userChildren.length = 0
        const fresh = newChildren.map((c) => buildChild(c))
        for (const c of fresh) elHtml.appendChild(c)
        userChildren.push(...fresh)

        applyProps(elHtml, newProps, listeners)
        el.performUpdate()
      },
      unmount() {
        elHtml.remove()
      },
    }
  },

  setup() {
    container = document.createElement('div')
    document.body.appendChild(container)
  },

  cleanup() {
    container?.remove()
  },
}

conformanceSuite(adapter)
