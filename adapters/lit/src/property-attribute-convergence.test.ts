/**
 * Web Components consumers routinely interact via either surface — `el.setAttribute('x', 'y')` or
 * `el.x = 'y'` — and expect the same pipeline result either way. The rest of this adapter's test
 * suite exercises the pipeline almost entirely through attributes (`mount()`'s `setup` callback,
 * every other test file); these assert the property-assignment side specifically, for every
 * praxis-owned property, without the explicit `requestUpdate()` nudge those other tests use — Lit's
 * own declared-property reactivity (installed by `static get properties()`) must be sufficient on
 * its own, with no manual flush, for every one of them except `as` (deliberately not declared —
 * see `createContractComponent`'s own doc comment).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { BoxElement, ButtonElement } from './test-components'

type LitEl = HTMLElement & { updateComplete: Promise<boolean> }

function define(name: string, ctor: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, ctor)
}

define('praxis-convergence-box', BoxElement)
define('praxis-convergence-button', ButtonElement)

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountBare<T extends HTMLElement>(tag: string): Promise<T> {
  const el = document.createElement(tag) as T
  document.body.appendChild(el)
  await (el as unknown as LitEl).updateComplete
  return el
}

describe('property vs. attribute convergence', () => {
  it('el.direction = "row" (property) matches setAttribute("direction", "row") (attribute)', async () => {
    const viaAttribute = await mountBare<HTMLElement>('praxis-convergence-box')
    viaAttribute.setAttribute('direction', 'row')
    ;(viaAttribute as unknown as LitEl & { requestUpdate(): void }).requestUpdate()
    await (viaAttribute as unknown as LitEl).updateComplete

    const viaProperty = await mountBare<HTMLElement & { direction?: string }>(
      'praxis-convergence-box',
    )
    viaProperty.direction = 'row'
    await (viaProperty as unknown as LitEl).updateComplete

    expect(viaProperty.className).toContain('flex-row')
    expect(viaProperty.className).toBe(viaAttribute.className)
  })

  it('el.recipe = "cta" (property) matches setAttribute("variant-key", "cta") (attribute)', async () => {
    const viaAttribute = await mountBare<HTMLElement>('praxis-convergence-button')
    viaAttribute.setAttribute('variant-key', 'cta')
    ;(viaAttribute as unknown as LitEl & { requestUpdate(): void }).requestUpdate()
    await (viaAttribute as unknown as LitEl).updateComplete

    const viaProperty = await mountBare<HTMLElement & { recipe?: string }>(
      'praxis-convergence-button',
    )
    viaProperty.recipe = 'cta'
    await (viaProperty as unknown as LitEl).updateComplete

    expect(viaProperty.className).toContain('btn-primary')
    expect(viaProperty.className).toBe(viaAttribute.className)
  })

  it('el.praxisClass = "extra" (property) matches setAttribute("praxis-class", "extra") (attribute)', async () => {
    const viaAttribute = await mountBare<HTMLElement>('praxis-convergence-box')
    viaAttribute.setAttribute('praxis-class', 'extra')
    ;(viaAttribute as unknown as LitEl & { requestUpdate(): void }).requestUpdate()
    await (viaAttribute as unknown as LitEl).updateComplete

    const viaProperty = await mountBare<HTMLElement & { praxisClass?: string }>(
      'praxis-convergence-box',
    )
    viaProperty.praxisClass = 'extra'
    await (viaProperty as unknown as LitEl).updateComplete

    expect(viaProperty.className).toContain('extra')
    expect(viaProperty.className).toBe(viaAttribute.className)
  })

  it('el.as = "a" (property) has no effect — as is not a declared property or pipeline input', async () => {
    const el = await mountBare<HTMLElement & { as?: string }>('praxis-convergence-box')
    const classBefore = el.className
    el.as = 'a'
    await (el as unknown as LitEl).updateComplete
    expect(el.className).toBe(classBefore)
    // Box has no explicit ARIA config — if `as` still influenced tag resolution, an
    // anchor-inferred role could leak in here. It shouldn't, before or after this change.
    expect(el.getAttribute('role')).toBeNull()
  })
})
