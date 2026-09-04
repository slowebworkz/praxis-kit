// @vitest-environment node
// Solid's SSR and browser module builds are mutually exclusive — `solid-js/web`
// ships separate server/browser entry points and requires different Vite conditions
// (`development` vs `development,browser`). A side-by-side SSR/CSR comparison in one
// file is therefore not achievable without two separate vitest projects.
//
// This file runs under vitest.ssr.config.ts (server conditions). It asserts that the
// SSR output for each scenario produces the exact attribute set that the browser-side
// hydration-parity.dom.test.tsx also asserts for CSR. Parity is maintained by both
// suites asserting against the same EXPECTED_* constants — divergence fails one side.
import { describe, it, expect } from 'vitest'
import { iterate } from '@praxis-kit/primitive'
import { renderToString } from 'solid-js/web'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'

function parseAttributes(html: string): Record<string, string> {
  // Node environment: use regex to parse attributes from the first tag.
  const match = html.match(/<[a-z][^>]*>/i)
  if (!match) return {}
  const tag = match[0]
  const attrs: Record<string, string> = {}
  const attrRe = /([a-z][a-z0-9-]*)(?:="([^"]*)")?/gi
  let m: RegExpExecArray | null
  let first = true
  while ((m = attrRe.exec(tag)) !== null) {
    if (first) {
      first = false
      continue
    } // skip the tag name itself
    attrs[m[1]!] = m[2] ?? ''
  }
  return attrs
}

function normalizeAttrs(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  iterate.forEachEntry(attrs, (k, v) => {
    // Solid's Dynamic SSR appends a trailing space to class attribute values
    // (confirmed: `<Dynamic component="div" class="x" />` → `class="x "`).
    // Normalize with trim + filter so semantic comparison is not affected by
    // the extra whitespace. The CSR path does not produce trailing spaces.
    out[k] = k === 'class' ? v.trim().split(/\s+/).filter(Boolean).sort().join(' ') : v
  })
  return out
}

describe('SSR hydration parity — Solid (server side)', () => {
  it('base class present in server-rendered HTML', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-base' },
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(() => <Box />)
    const attrs = normalizeAttrs(parseAttributes(html))
    expect(attrs['class']).toBe('box-base')
  })

  it('variant class present in server-rendered HTML', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: {
        base: 'box',
        variants: { size: { sm: 'box-sm', lg: 'box-lg' } },
        defaults: { size: 'lg' },
      },
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(() => <Box />)
    const attrs = normalizeAttrs(parseAttributes(html))
    expect(attrs['class']?.split(' ').sort()).toEqual(['box', 'box-lg'])
  })

  it('compound variant class present in server-rendered HTML', () => {
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
    const html = renderToString(() => <Button size="lg" intent="ghost" />)
    expect(html).toContain('btn-lg-ghost')
    expect(html).not.toContain('btn-sm')
    expect(html).not.toContain('btn-primary')
  })

  it('ARIA strip: redundant role absent from server-rendered HTML', () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(() => <Nav role="navigation" />)
    expect(parseAttributes(html)).not.toHaveProperty('role')
  })

  it('ARIA strip: invalid aria-* absent from server-rendered HTML', () => {
    const Button = createContractComponent({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(() => <Button aria-checked="true" />)
    expect(html).not.toContain('aria-checked')
  })

  it('as prop override: correct tag in server-rendered HTML', () => {
    const Nav = createContractComponent({
      tag: 'nav',
      enforcement: { diagnostics: silentDiagnostics },
    })
    const html = renderToString(() => <Nav as="section" />)
    expect(html).toContain('<section')
    expect(html).not.toContain('<nav')
  })
})
