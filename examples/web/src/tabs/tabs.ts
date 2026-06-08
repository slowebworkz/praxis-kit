/**
 * Tabs — compound component for the web adapter built on praxis-kit.
 *
 * praxis-kit owns the contract layer (class pipeline, children enforcement,
 * ARIA). Selection state lives on the root as `data-value`; descendants derive
 * their state via closest('example-tabs-root').
 *
 * Setting `value` on the root drives controlled mode — the same code path as
 * the uncontrolled click flow, just invoked from attributeChangedCallback.
 *
 * Usage:
 *   <example-tabs-root value="a">
 *     <example-tabs-list>
 *       <example-tabs-trigger value="a">Tab A</example-tabs-trigger>
 *       <example-tabs-trigger value="b">Tab B</example-tabs-trigger>
 *     </example-tabs-list>
 *     <example-tabs-content value="a">Panel A</example-tabs-content>
 *     <example-tabs-content value="b">Panel B</example-tabs-content>
 *   </example-tabs-root>
 */
import { createContractComponent } from '@praxis-kit/web'
import type { StrictMode } from '@praxis-kit/core'

// Typed base for subclassing praxis components. TypeScript doesn't include CE
// lifecycle methods on HTMLElement, so we declare them here and cast the praxis
// factory output to this type — that lets subclasses call super.connectedCallback?.().
// Prefixed _ so noUnusedLocals doesn't flag it (typeof _PraxisCE in a cast is type-only).
declare class _PraxisCE extends HTMLElement {
  connectedCallback?(): void
  disconnectedCallback?(): void
  attributeChangedCallback?(_: string, _o: string | null, _n: string | null): void
  static readonly observedAttributes?: readonly string[]
  static readonly strict?: StrictMode
}

// Guards that match child elements by tag name. Tag-name coupling is a known
// limitation — a future Symbol-based contract marker on the factory output would
// decouple this from the registration name.
function createElementGuard(tag: string): (child: unknown) => child is Element {
  const lower = tag.toLowerCase()
  return (child): child is Element =>
    child instanceof Element && child.tagName.toLowerCase() === lower
}

// ── Trigger ───────────────────────────────────────────────────────────────────

const _Trigger = createContractComponent({
  tag: 'button',
  name: 'TabsTrigger',
  defaults: { type: 'button', role: 'tab' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
  enforcement: { strict: 'warn' },
}) as unknown as typeof _PraxisCE

export class Trigger extends _Trigger {
  connectedCallback() {
    super.connectedCallback?.()
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0
    this.addEventListener('click', this._onClick)
  }

  disconnectedCallback() {
    super.disconnectedCallback?.()
    this.removeEventListener('click', this._onClick)
  }

  private _onClick = () => {
    this.dispatchEvent(
      new CustomEvent('tabs:select', {
        bubbles: true,
        composed: true,
        detail: { value: this.getAttribute('value') },
      }),
    )
  }
}

// ── Content ───────────────────────────────────────────────────────────────────

export const Content = createContractComponent({
  tag: 'div',
  name: 'TabsContent',
  defaults: { role: 'tabpanel' },
  styling: { base: 'py-4 text-sm' },
  enforcement: { strict: 'warn' },
})

// ── List ──────────────────────────────────────────────────────────────────────

export const List = createContractComponent({
  tag: 'div',
  name: 'TabsList',
  defaults: { role: 'tablist' },
  styling: { base: 'inline-flex gap-1 border-b border-gray-200' },
  enforcement: {
    strict: 'warn',
    children: [
      {
        name: 'Trigger',
        match: createElementGuard('example-tabs-trigger'),
        cardinality: { min: 1 },
      },
    ],
  },
})

// ── Root ──────────────────────────────────────────────────────────────────────

const _Root = createContractComponent({
  tag: 'div',
  name: 'TabsRoot',
  styling: { base: 'flex flex-col' },
  enforcement: {
    strict: 'warn',
    children: [
      {
        name: 'List',
        match: createElementGuard('example-tabs-list'),
        cardinality: { min: 1, max: 1 },
      },
      {
        name: 'Content',
        match: createElementGuard('example-tabs-content'),
        cardinality: { min: 1 },
      },
    ],
  },
}) as unknown as typeof _PraxisCE

export class Root extends _Root {
  static get observedAttributes(): string[] {
    return [...(_Root.observedAttributes ?? []), 'value']
  }

  connectedCallback() {
    super.connectedCallback?.()
    this.addEventListener('tabs:select', this._onSelect as EventListener)
    this.addEventListener('keydown', this._onKeyDown)
    this.setActiveValue(this.getAttribute('value') ?? this._firstTriggerValue())
  }

  disconnectedCallback() {
    super.disconnectedCallback?.()
    this.removeEventListener('tabs:select', this._onSelect as EventListener)
    this.removeEventListener('keydown', this._onKeyDown)
  }

  attributeChangedCallback(name: string, old: string | null, next: string | null) {
    super.attributeChangedCallback?.(name, old, next)
    if (name === 'value' && next !== old) this.setActiveValue(next)
  }

  setActiveValue(value: string | null): void {
    const triggers = Array.from(this.querySelectorAll('example-tabs-trigger'))
    const valid = triggers.some((el) => el.getAttribute('value') === value)

    if (!valid) {
      const fallback = triggers[0]?.getAttribute('value') ?? null
      if (value !== null) {
        const msg = `[TabsRoot] setActiveValue: "${value}" does not match any trigger. Falling back to "${fallback}".`
        const strict = _Root.strict
        if (strict === true || strict === 'throw') throw new Error(msg)
        else if (strict === 'async-warn') queueMicrotask(() => console.warn(msg))
        else if (strict) console.warn(msg)
      }
      value = fallback
    }

    if (value !== null) this.dataset.value = value

    for (const el of triggers) {
      const v = el.getAttribute('value')
      ;(el as HTMLElement).dataset.state = v === value ? 'active' : 'inactive'
      el.setAttribute('aria-selected', String(v === value))
    }

    for (const el of this.querySelectorAll('example-tabs-content')) {
      ;(el as HTMLElement).hidden = el.getAttribute('value') !== value
    }
  }

  private _firstTriggerValue(): string | null {
    return this.querySelector('example-tabs-trigger')?.getAttribute('value') ?? null
  }

  private _triggers(): HTMLElement[] {
    return Array.from(this.querySelectorAll('example-tabs-trigger')) as HTMLElement[]
  }

  private _onSelect = (event: Event) => {
    this.setActiveValue((event as CustomEvent<{ value: string }>).detail.value)
  }

  // WAI-ARIA keyboard pattern for tabs (automatic activation).
  private _onKeyDown = (event: KeyboardEvent) => {
    const triggers = this._triggers()
    const focused = triggers.indexOf(event.target as HTMLElement)
    if (focused === -1) return

    let next: number | undefined
    if (event.key === 'ArrowRight') next = (focused + 1) % triggers.length
    else if (event.key === 'ArrowLeft') next = (focused - 1 + triggers.length) % triggers.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = triggers.length - 1

    if (next !== undefined) {
      event.preventDefault()
      const target = triggers[next]
      if (target) {
        target.focus()
        this.setActiveValue(target.getAttribute('value'))
      }
    }
  }
}
