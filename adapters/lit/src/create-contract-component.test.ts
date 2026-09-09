import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import {
  BoxElement,
  ButtonElement,
  NavElement,
  TabsRootElement,
  TabsTriggerElement,
  TabsContentElement,
} from './test-components'

// Guard against duplicate registration — customElements.define() is global and
// throws if the same name is defined twice in the same test runner process.
beforeAll(() => {
  if (!customElements.get('praxis-box')) customElements.define('praxis-box', BoxElement)
  if (!customElements.get('praxis-button')) customElements.define('praxis-button', ButtonElement)
  if (!customElements.get('praxis-nav')) customElements.define('praxis-nav', NavElement)
  if (!customElements.get('praxis-tabs-root'))
    customElements.define('praxis-tabs-root', TabsRootElement)
  if (!customElements.get('praxis-tabs-trigger'))
    customElements.define('praxis-tabs-trigger', TabsTriggerElement)
  if (!customElements.get('praxis-tabs-content'))
    customElements.define('praxis-tabs-content', TabsContentElement)
})

type LitEl = HTMLElement & { updateComplete: Promise<boolean>; requestUpdate(): void }

// Connect first so Lit's property system is fully initialized, then apply
// attributes, then force a Lit update cycle.
// requestUpdate() is needed for non-reactive attributes (aria-*, role, data-*)
// that don't trigger Lit's property observation on their own.
async function mount<T extends HTMLElement>(tag: string, setup?: (el: T) => void): Promise<T> {
  const el = document.createElement(tag) as T
  document.body.appendChild(el)
  await (el as unknown as LitEl).updateComplete
  if (setup) {
    setup(el)
    ;(el as unknown as LitEl).requestUpdate()
    await (el as unknown as LitEl).updateComplete
  }
  return el
}

async function update(el: HTMLElement, fn: (el: HTMLElement) => void): Promise<void> {
  fn(el)
  ;(el as unknown as LitEl).requestUpdate()
  await (el as unknown as LitEl).updateComplete
}

afterEach(() => {
  document.body.innerHTML = ''
})

// ─── Box — base class ─────────────────────────────────────────────────────────

describe('Box — base class', () => {
  it('applies base class on mount', async () => {
    const el = await mount('praxis-box')
    expect(el.className).toContain('box-base')
  })
})

// ─── Box — variants ───────────────────────────────────────────────────────────

describe('Box — variants', () => {
  it('applies direction variant', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('direction', 'row'))
    expect(el.className).toContain('flex-row')
  })

  it('applies gap variant', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('gap', 'lg'))
    expect(el.className).toContain('gap-8')
  })

  it('applies multiple variants simultaneously', async () => {
    const el = await mount('praxis-box', (e) => {
      e.setAttribute('direction', 'col')
      e.setAttribute('gap', 'sm')
    })
    expect(el.className).toContain('flex-col')
    expect(el.className).toContain('gap-2')
  })

  it('replaces class when variant changes (row → col)', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('direction', 'row'))
    expect(el.className).toContain('flex-row')

    await update(el, (e) => e.setAttribute('direction', 'col'))
    expect(el.className).toContain('flex-col')
    expect(el.className).not.toContain('flex-row')
  })

  it('removes variant class when attribute is removed', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('direction', 'row'))
    expect(el.className).toContain('flex-row')

    await update(el, (e) => e.removeAttribute('direction'))
    expect(el.className).not.toContain('flex-row')
    expect(el.className).toContain('box-base')
  })
})

// ─── Box — presets ────────────────────────────────────────────────────────────

describe('Box — presets', () => {
  it('activates row preset via variant-key', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('variant-key', 'row'))
    expect(el.className).toContain('flex-row')
    expect(el.className).toContain('gap-4')
  })

  it('activates column preset via variant-key', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('variant-key', 'column'))
    expect(el.className).toContain('flex-col')
    expect(el.className).toContain('gap-8')
  })

  it('switches between presets', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('variant-key', 'row'))
    expect(el.className).toContain('flex-row')

    await update(el, (e) => e.setAttribute('variant-key', 'column'))
    expect(el.className).toContain('flex-col')
    expect(el.className).not.toContain('flex-row')
  })

  it('explicit prop overrides preset', async () => {
    const el = await mount('praxis-box', (e) => {
      e.setAttribute('variant-key', 'row')
      e.setAttribute('gap', 'sm')
    })
    expect(el.className).toContain('gap-2')
    expect(el.className).not.toContain('gap-4')
  })

  it('restores base state when preset is removed', async () => {
    const el = await mount('praxis-box', (e) => e.setAttribute('variant-key', 'row'))
    expect(el.className).toContain('flex-row')

    await update(el, (e) => e.removeAttribute('variant-key'))
    expect(el.className).not.toContain('flex-row')
    expect(el.className).toContain('box-base')
  })
})

// ─── Button — base class and defaults ────────────────────────────────────────

describe('Button — base class and defaults', () => {
  it('applies base class', async () => {
    const el = await mount('praxis-button')
    expect(el.className).toContain('btn-base')
  })

  it('applies default size and intent', async () => {
    const el = await mount('praxis-button')
    expect(el.className).toContain('btn-md')
    expect(el.className).toContain('btn-ghost')
  })
})

// ─── Button — variants ───────────────────────────────────────────────────────

describe('Button — variants', () => {
  it('applies primary intent', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('btn-primary')
    expect(el.className).not.toContain('btn-ghost')
  })

  it('applies sm size', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('size', 'sm'))
    expect(el.className).toContain('btn-sm')
    expect(el.className).not.toContain('btn-md')
  })

  it('restores default intent when variant attribute is removed', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('btn-primary')

    await update(el, (e) => e.removeAttribute('intent'))
    expect(el.className).toContain('btn-ghost')
    expect(el.className).not.toContain('btn-primary')
  })

  it('updates when a variant changes multiple times', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('btn-primary')

    await update(el, (e) => e.setAttribute('intent', 'ghost'))
    expect(el.className).toContain('btn-ghost')
    expect(el.className).not.toContain('btn-primary')

    await update(el, (e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('btn-primary')
    expect(el.className).not.toContain('btn-ghost')
  })
})

// ─── Button — presets ────────────────────────────────────────────────────────

describe('Button — presets', () => {
  it('cta preset applies primary + lg', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('variant-key', 'cta'))
    expect(el.className).toContain('btn-primary')
    expect(el.className).toContain('btn-lg')
  })

  it('subtle preset applies ghost + sm', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('variant-key', 'subtle'))
    expect(el.className).toContain('btn-ghost')
    expect(el.className).toContain('btn-sm')
  })

  it('switches between presets', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('variant-key', 'cta'))
    expect(el.className).toContain('btn-primary')

    await update(el, (e) => e.setAttribute('variant-key', 'subtle'))
    expect(el.className).toContain('btn-ghost')
    expect(el.className).not.toContain('btn-primary')
  })
})

// ─── Button — prop pipeline ───────────────────────────────────────────────────

describe('Button — prop pipeline', () => {
  it('variant props contribute to className', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('intent', 'primary'))
    expect(el.className).toContain('btn-primary')
  })

  it('forwards aria-label through the ARIA pipeline', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('aria-label', 'Close'))
    expect(el.getAttribute('aria-label')).toBe('Close')
  })

  it('forwards data attributes through the pipeline', async () => {
    const el = await mount('praxis-button', (e) => e.setAttribute('data-testid', 'btn'))
    expect(el.getAttribute('data-testid')).toBe('btn')
  })
})

// ─── Nav — ARIA pipeline ──────────────────────────────────────────────────────

describe('Nav — ARIA pipeline', () => {
  it('preserves aria-label on a nav element', async () => {
    const el = await mount('praxis-nav', (e) => e.setAttribute('aria-label', 'Main'))
    expect(el.getAttribute('aria-label')).toBe('Main')
  })

  it('strips redundant role="navigation" from a <nav> element', async () => {
    // <nav> has implicit role="navigation"; an explicit redundant role is stripped.
    const el = await mount('praxis-nav', (e) => e.setAttribute('role', 'navigation'))
    expect(el.getAttribute('role')).toBeNull()
  })
})

// ─── Tabs — children enforcement ─────────────────────────────────────────────

describe('Tabs — children enforcement', () => {
  it('resolves successfully when required children are present', async () => {
    const root = document.createElement('praxis-tabs-root')
    root.appendChild(document.createElement('praxis-tabs-trigger'))
    root.appendChild(document.createElement('praxis-tabs-content'))
    document.body.appendChild(root)
    await expect((root as unknown as LitEl).updateComplete).resolves.toBeDefined()
  })

  it('throws when required children are missing (strict: throw)', async () => {
    const root = document.createElement('praxis-tabs-root')
    document.body.appendChild(root)
    await expect((root as unknown as LitEl).updateComplete).rejects.toThrow()
  })
})

// ─── Selective update guard ───────────────────────────────────────────────────

describe('selective update guard', () => {
  it('runs the pipeline when a praxis-owned prop changes', async () => {
    const el = await mount<HTMLElement & { direction?: string }>('praxis-box')
    const before = el.className
    el.setAttribute('direction', 'col')
    await update(el, () => {})
    expect(el.className).not.toBe(before)
    expect(el.className).toContain('flex-col')
  })

  it('runs the pipeline on manual requestUpdate() — required for ARIA/role changes', async () => {
    const el = await mount('praxis-nav', (e) => e.setAttribute('role', 'navigation'))
    // role should have been stripped by the ARIA engine on the first pipeline run.
    expect(el.getAttribute('role')).toBeNull()
    // Re-apply the attribute and force a manual pipeline flush.
    el.setAttribute('role', 'navigation')
    await update(el, () => {})
    expect(el.getAttribute('role')).toBeNull()
  })

  it('does not re-run the pipeline for a non-praxis reactive property on a subclass', async () => {
    // Register a subclass with an extra reactive property that the praxis
    // pipeline knows nothing about. A change to that property should not
    // trigger _applyPraxis().
    const _lit = await import('lit')
    const BoxBase = customElements.get('praxis-box')! as typeof _lit.LitElement
    class BoxWithExtra extends BoxBase {
      static override get properties() {
        return { ...super.properties, extra: { type: String } }
      }
      declare extra: string | undefined
    }
    const tag = 'praxis-box-with-extra'
    if (!customElements.get(tag)) customElements.define(tag, BoxWithExtra)

    const el = document.createElement(tag) as HTMLElement & {
      extra: string | undefined
      updateComplete: Promise<boolean>
    }
    document.body.appendChild(el)
    await el.updateComplete

    const classBefore = el.className

    // Change the non-praxis property — should NOT re-run the class pipeline.
    ;(el as unknown as { extra: string }).extra = 'foo'
    await el.updateComplete

    expect(el.className).toBe(classBefore)
  })
})
