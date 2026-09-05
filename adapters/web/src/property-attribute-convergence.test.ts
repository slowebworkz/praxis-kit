/**
 * Web Components consumers routinely interact via either surface — `el.setAttribute('x', 'y')` or
 * `el.x = 'y'` — and expect the same pipeline result either way. Unlike Lit (which installs real
 * reactive-property accessors via `static get properties()`), this adapter has none: a praxis-owned
 * property set directly is just a plain own-property assignment with no observer at all — only
 * `setAttribute` fires `attributeChangedCallback` and re-runs the pipeline automatically. A property
 * assignment converges to the same result only once `.update()` is called explicitly (documented on
 * `createContractComponent`'s own doc comment). Both halves of that contract are pinned here: the
 * convergence once `.update()` runs, and — just as importantly — that skipping it leaves the
 * pipeline stale, so a caller can't assume property assignment alone is reactive the way it is on
 * Lit's adapter (`adapters/lit/src/property-attribute-convergence.test.ts`).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { BoxElement, ButtonElement } from './test-components'

type WebEl = HTMLElement & { update(): void }

function define(name: string, ctor: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, ctor)
}

define('praxis-convergence-box', BoxElement as unknown as CustomElementConstructor)
define('praxis-convergence-button', ButtonElement as unknown as CustomElementConstructor)

afterEach(() => {
  document.body.innerHTML = ''
})

function mount<T extends HTMLElement>(tag: string): T {
  const el = document.createElement(tag) as T
  document.body.appendChild(el)
  return el
}

describe('property vs. attribute convergence', () => {
  it('el.direction = "row" (property) + update() matches setAttribute("direction", "row") (attribute)', () => {
    const viaAttribute = mount<HTMLElement>('praxis-convergence-box')
    viaAttribute.setAttribute('direction', 'row')

    const viaProperty = mount<HTMLElement & WebEl & { direction?: string }>(
      'praxis-convergence-box',
    )
    viaProperty.direction = 'row'
    viaProperty.update()

    expect(viaProperty.className).toContain('flex-row')
    expect(viaProperty.className).toBe(viaAttribute.className)
  })

  it('el.recipe = "cta" (property) + update() matches setAttribute("variant-key", "cta") (attribute)', () => {
    const viaAttribute = mount<HTMLElement>('praxis-convergence-button')
    viaAttribute.setAttribute('variant-key', 'cta')

    const viaProperty = mount<HTMLElement & WebEl & { recipe?: string }>(
      'praxis-convergence-button',
    )
    viaProperty.recipe = 'cta'
    viaProperty.update()

    expect(viaProperty.className).toContain('btn-primary')
    expect(viaProperty.className).toBe(viaAttribute.className)
  })

  it('el.praxisClass = "extra" (property) + update() matches setAttribute("praxis-class", "extra") (attribute)', () => {
    const viaAttribute = mount<HTMLElement>('praxis-convergence-box')
    viaAttribute.setAttribute('praxis-class', 'extra')

    const viaProperty = mount<HTMLElement & WebEl & { praxisClass?: string }>(
      'praxis-convergence-box',
    )
    viaProperty.praxisClass = 'extra'
    viaProperty.update()

    expect(viaProperty.className).toContain('extra')
    expect(viaProperty.className).toBe(viaAttribute.className)
  })

  it('el.as = "a" (property) + update() has no effect — as is never a pipeline input', () => {
    const el = mount<HTMLElement & WebEl & { as?: string }>('praxis-convergence-box')
    const classBefore = el.className
    el.as = 'a'
    el.update()
    expect(el.className).toBe(classBefore)
    // Box has no explicit ARIA config — if `as` still influenced tag resolution, an
    // anchor-inferred role could leak in here. It shouldn't, before or after this change.
    expect(el.getAttribute('role')).toBeNull()
  })

  it('property assignment alone, without update(), does not apply — unlike setAttribute', () => {
    // The other half of the contract: property assignment isn't secretly reactive here. A
    // consumer who forgets update() gets a stale render, not a silent pipeline run.
    const el = mount<HTMLElement & { direction?: string }>('praxis-convergence-box')
    const classBefore = el.className
    el.direction = 'row'
    expect(el.className).toBe(classBefore)
    expect(el.className).not.toContain('flex-row')
  })
})
