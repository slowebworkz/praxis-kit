import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from './tabs'

type LitEl = HTMLElement & { updateComplete: Promise<boolean> }

beforeAll(() => {
  customElements.define('example-tabs-root', TabsRoot as unknown as CustomElementConstructor)
  customElements.define('example-tabs-list', TabsList as unknown as CustomElementConstructor)
  customElements.define('example-tabs-trigger', TabsTrigger as unknown as CustomElementConstructor)
  customElements.define('example-tabs-content', TabsContent as unknown as CustomElementConstructor)
})

afterEach(() => {
  document.body.innerHTML = ''
})

function buildTabs(triggerCount = 2, contentCount = 2): HTMLElement {
  const root = document.createElement('example-tabs-root')
  const list = document.createElement('example-tabs-list')

  for (let i = 1; i <= triggerCount; i++) {
    const trigger = document.createElement('example-tabs-trigger')
    trigger.setAttribute('value', String(i))
    trigger.textContent = `Tab ${i}`
    list.appendChild(trigger)
  }
  root.appendChild(list)

  for (let i = 1; i <= contentCount; i++) {
    const content = document.createElement('example-tabs-content')
    content.setAttribute('value', String(i))
    content.textContent = `Panel ${i}`
    root.appendChild(content)
  }

  return root
}

describe('TabsTrigger — styling', () => {
  it('applies base class', async () => {
    const el = document.createElement('example-tabs-trigger') as LitEl
    document.body.appendChild(el)
    await el.updateComplete
    expect(el.className).toContain('px-3')
  })
})

describe('TabsContent — styling', () => {
  it('applies base class', async () => {
    const el = document.createElement('example-tabs-content') as LitEl
    document.body.appendChild(el)
    await el.updateComplete
    expect(el.className).toContain('py-4')
  })
})

describe('TabsList — styling', () => {
  it('applies base class', async () => {
    const el = document.createElement('example-tabs-list') as LitEl
    const trigger = document.createElement('example-tabs-trigger')
    el.appendChild(trigger)
    document.body.appendChild(el)
    await el.updateComplete
    expect(el.className).toContain('inline-flex')
  })
})

describe('TabsRoot — styling', () => {
  it('applies base class', async () => {
    const root = buildTabs() as LitEl
    document.body.appendChild(root)
    await root.updateComplete
    expect(root.className).toContain('flex')
  })
})

describe('TabsRoot — children enforcement', () => {
  it('resolves successfully with valid structure', async () => {
    const root = buildTabs() as LitEl
    document.body.appendChild(root)
    await expect(root.updateComplete).resolves.toBeDefined()
  })
})
