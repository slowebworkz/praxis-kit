import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'
import { iterate } from '@praxis-kit/primitive'
import type { ConformanceComponent, HydrationConformanceAdapter } from './types'
import { silentCreate } from './helpers'

export type { HydrationConformanceAdapter } from './types'

type Attributes = StringMap<string>

function readAttributes(el: Element): Attributes {
  const out: Attributes = {}
  iterate.forEach(iterate.items(el.attributes), ({ name, value }) => {
    out[name] = value
  })
  return out
}

function parseAttributes(html: string): Attributes {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const child = tpl.content.firstElementChild
  return child ? readAttributes(child) : {}
}

function normalizeAttrs(attrs: Attributes): Attributes {
  const out: Attributes = {}
  iterate.forEachEntry(attrs, (k, v) => {
    out[k] = k === 'class' ? v.split(' ').sort().join(' ') : v
  })
  return out
}

async function ssrAttrs<C extends ConformanceComponent>(
  adapter: HydrationConformanceAdapter<C>,
  comp: C,
  props?: AnyRecord,
): Promise<Attributes> {
  const html = await adapter.renderToString(comp, props)
  return normalizeAttrs(parseAttributes(html))
}

async function domAttrs<C extends ConformanceComponent>(
  adapter: HydrationConformanceAdapter<C>,
  comp: C,
  props?: AnyRecord,
): Promise<Attributes> {
  return normalizeAttrs(readAttributes(await adapter.renderToDOM(comp, props)))
}

/**
 * Hydration parity suite. Verifies that server-rendered HTML and
 * client-rendered DOM produce identical attribute sets.
 *
 * Run in a `// @vitest-environment jsdom` test file.
 */
export function hydrationParitySuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: HydrationConformanceAdapter<C>,
): void {
  beforeEach(() => adapter.setup())
  afterEach(() => adapter.cleanup())

  // Every case here silences diagnostics so only attribute parity is under test.
  const create = silentCreate(adapter)

  const attrsOf = async (comp: C, props?: AnyRecord) => ({
    server: await ssrAttrs(adapter, comp, props),
    client: await domAttrs(adapter, comp, props),
  })

  // Asserts the two sides are identical and returns them for any further checks.
  const expectParity = async (comp: C, props?: AnyRecord) => {
    const attrs = await attrsOf(comp, props)
    expect(attrs.server).toEqual(attrs.client)
    return attrs
  }

  describe('hydration parity — class attributes', () => {
    it('base class matches between server and client', async () => {
      await expectParity(create({ styling: { base: 'box-base' } }))
    })

    it('variant class matches between server and client', async () => {
      await expectParity(
        create({
          styling: {
            variants: { size: { sm: 'box-sm', lg: 'box-lg' } },
            defaults: { size: 'lg' },
          },
        }),
      )
    })

    it('compound variant class matches between server and client', async () => {
      const Box = create({
        styling: {
          base: 'btn',
          variants: {
            size: { sm: 'btn-sm', lg: 'btn-lg' },
            intent: { primary: 'btn-primary', ghost: 'btn-ghost' },
          },
          compounds: [{ size: 'lg', intent: 'ghost', class: 'btn-lg-ghost' }],
        },
      })
      const { server } = await expectParity(Box, { size: 'lg', intent: 'ghost' })
      expect(server['class']?.split(' ')).toContain('btn-lg-ghost')
    })
  })

  describe('hydration parity — ARIA normalisation', () => {
    it('redundant role absent on both server and client', async () => {
      const { server, client } = await expectParity(create({ tag: 'nav' }), {
        role: 'navigation',
      })
      expect(server).not.toHaveProperty('role')
      expect(client).not.toHaveProperty('role')
    })

    it('non-redundant role present on both server and client', async () => {
      const { server, client } = await attrsOf(create(), { role: 'dialog' })
      expect(server['role']).toBe('dialog')
      expect(client['role']).toBe('dialog')
    })
  })

  describe('hydration parity — tag and props', () => {
    it('as prop override: tag matches between server and client', async () => {
      const Box = create()
      const props = { as: 'section' }
      const serverHtml = await adapter.renderToString(Box, props)
      const clientEl = await adapter.renderToDOM(Box, props)
      expect(serverHtml).toContain('<section')
      expect(clientEl.tagName.toLowerCase()).toBe('section')
    })
  })
}
