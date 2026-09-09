import { describe, expect, it } from 'vitest'

import type { AnyRecord, AriaContext } from '../types'
import { roleNotPermittedRule } from './role-restrictions'

function ctx(tag: string, props: AnyRecord, implicitRole: string | undefined): AriaContext {
  return {
    tag: tag as AriaContext['tag'],
    props,
    implicitRole,
    effectiveRole: undefined,
    variantKeys: new Set(),
  }
}

describe('roleNotPermittedRule', () => {
  it('allows a documented alternate role', () => {
    expect(
      roleNotPermittedRule(ctx('input', { type: 'checkbox', role: 'switch' }, 'checkbox')),
    ).toEqual([])
    expect(roleNotPermittedRule(ctx('a', { role: 'button' }, 'link'))).toEqual([])
    expect(roleNotPermittedRule(ctx('ul', { role: 'tree' }, 'list'))).toEqual([])
  })

  it('flags a role outside the documented alternates', () => {
    const [result] = roleNotPermittedRule(
      ctx('input', { type: 'checkbox', role: 'banner' }, 'checkbox'),
    )
    expect(result).toMatchObject({ valid: false, severity: 'error', fixable: true })
  })

  it('flags any explicit role on a type with no permitted alternates (e.g. hidden)', () => {
    const [result] = roleNotPermittedRule(
      ctx('input', { type: 'hidden', role: 'textbox' }, undefined),
    )
    expect(result).toMatchObject({ valid: false, severity: 'error' })
  })

  it('is a no-op when role matches the implicit role (redundant-role check owns that case)', () => {
    expect(
      roleNotPermittedRule(ctx('input', { type: 'checkbox', role: 'checkbox' }, 'checkbox')),
    ).toEqual([])
  })

  it('checks an unknown <input type> against the text fallback (HTML treats it as text)', () => {
    // "menu" is not permitted on type="text", and an unknown type behaves as text.
    const [result] = roleNotPermittedRule(
      ctx('input', { type: 'made-up-type', role: 'menu' }, undefined),
    )
    expect(result).toMatchObject({ valid: false })
    // "combobox" *is* permitted on type="text", so the unknown type accepts it too.
    expect(
      roleNotPermittedRule(ctx('input', { type: 'made-up-type', role: 'combobox' }, undefined)),
    ).toEqual([])
  })

  it('is a no-op for a tag with no modeled allowed-roles table', () => {
    expect(roleNotPermittedRule(ctx('td', { role: 'gridcell' }, 'cell'))).toEqual([])
  })

  it('removes the role when the fix is applied', () => {
    const context = ctx('input', { type: 'checkbox', role: 'banner' }, 'checkbox')
    const [result] = roleNotPermittedRule(context)
    if (!result || result.valid || !result.fixable) throw new Error('expected a fixable violation')
    const fixResult = result.fix.apply(context)
    expect(fixResult).toMatchObject({ applied: true, next: { type: 'checkbox' } })
  })

  it('treats decorative images (alt="") as permitting no explicit role', () => {
    const [result] = roleNotPermittedRule(ctx('img', { alt: '', role: 'img' }, 'none'))
    expect(result).toMatchObject({ valid: false, severity: 'error' })
  })

  it('allows a documented alternate role on a named image', () => {
    expect(roleNotPermittedRule(ctx('img', { alt: 'A cat', role: 'button' }, 'img'))).toEqual([])
  })

  it('flags any explicit role on label — native labeling semantics have no ARIA equivalent', () => {
    const [result] = roleNotPermittedRule(ctx('label', { role: 'presentation' }, undefined))
    expect(result).toMatchObject({ valid: false, severity: 'error', fixable: true })
  })

  it('is a no-op for label with no role', () => {
    expect(roleNotPermittedRule(ctx('label', {}, undefined))).toEqual([])
  })

  // ─── ARIA-in-HTML conformance-table regressions (see docs/accessibility/html-aria-audit.md) ───

  describe('ARIA-in-HTML allowed-role tables', () => {
    it('nav permits the five spec alternates (C1)', () => {
      for (const role of ['menu', 'menubar', 'none', 'presentation', 'tablist']) {
        expect(roleNotPermittedRule(ctx('nav', { role }, 'navigation'))).toEqual([])
      }
    })

    it('aside permits note (C2)', () => {
      expect(roleNotPermittedRule(ctx('aside', { role: 'note' }, 'complementary'))).toEqual([])
    })

    it('button permits combobox/gridcell/separator/slider/treeitem (C3)', () => {
      for (const role of ['combobox', 'gridcell', 'separator', 'slider', 'treeitem']) {
        expect(roleNotPermittedRule(ctx('button', { role }, 'button'))).toEqual([])
      }
    })

    it('ul/ol permit none and presentation, reject deprecated directory (C4)', () => {
      expect(roleNotPermittedRule(ctx('ul', { role: 'presentation' }, 'list'))).toEqual([])
      expect(roleNotPermittedRule(ctx('ol', { role: 'none' }, 'list'))).toEqual([])
      const [directory] = roleNotPermittedRule(ctx('ul', { role: 'directory' }, 'list'))
      expect(directory).toMatchObject({ valid: false, fixable: true })
    })

    it('named <img> permits math, meter and radio (C5)', () => {
      for (const role of ['math', 'meter', 'radio']) {
        expect(roleNotPermittedRule(ctx('img', { alt: 'A chart', role }, 'img'))).toEqual([])
      }
    })

    it('input type=email/tel/url/search reject combobox without a list attribute (C6/C7)', () => {
      for (const type of ['email', 'tel', 'url', 'search']) {
        const [result] = roleNotPermittedRule(
          ctx('input', { type, role: 'combobox' }, type === 'search' ? 'searchbox' : 'textbox'),
        )
        expect(result).toMatchObject({ valid: false })
      }
    })

    it('input type=email with a list attribute accepts combobox (implicit-role path)', () => {
      // `list` flips the implicit role to combobox; role === implicitRole early-returns.
      expect(
        roleNotPermittedRule(
          ctx('input', { type: 'email', list: 'x', role: 'combobox' }, 'combobox'),
        ),
      ).toEqual([])
    })

    it('input type=button/submit/reset accept the widened button-like set (C8)', () => {
      for (const type of ['button', 'submit', 'reset']) {
        for (const role of [
          'checkbox',
          'combobox',
          'gridcell',
          'separator',
          'slider',
          'treeitem',
        ]) {
          expect(roleNotPermittedRule(ctx('input', { type, role }, 'button'))).toEqual([])
        }
      }
    })

    it('input type=image accepts the button-like set but not combobox (C8)', () => {
      expect(
        roleNotPermittedRule(ctx('input', { type: 'image', role: 'slider' }, 'button')),
      ).toEqual([])
      const [combobox] = roleNotPermittedRule(
        ctx('input', { type: 'image', role: 'combobox' }, 'button'),
      )
      expect(combobox).toMatchObject({ valid: false })
    })
  })

  // ─── F2: <input list> and <select multiple/size> second discriminators ───

  describe('input[list] narrows the permitted role set (F2)', () => {
    it('flags a non-combobox role on a text-like input with a list attribute', () => {
      for (const type of ['text', 'search', 'tel', 'url', 'email']) {
        const [result] = roleNotPermittedRule(
          ctx('input', { type, list: 'suggestions', role: 'spinbutton' }, 'combobox'),
        )
        expect(result).toMatchObject({ valid: false, fixable: true })
      }
    })

    it('still accepts combobox on a text input with a list (redundant-role path)', () => {
      expect(
        roleNotPermittedRule(
          ctx('input', { type: 'text', list: 'x', role: 'combobox' }, 'combobox'),
        ),
      ).toEqual([])
    })

    it('does not narrow when list is absent — the type table still applies', () => {
      expect(
        roleNotPermittedRule(ctx('input', { type: 'text', role: 'searchbox' }, 'textbox')),
      ).toEqual([])
    })

    it('does not narrow a non-text-like type that happens to carry a list', () => {
      expect(
        roleNotPermittedRule(
          ctx('input', { type: 'checkbox', list: 'x', role: 'switch' }, 'checkbox'),
        ),
      ).toEqual([])
    })
  })

  describe('select permits no explicit role in its list-box form (F2)', () => {
    it('permits menu on a default drop-down <select>', () => {
      expect(roleNotPermittedRule(ctx('select', { role: 'menu' }, 'combobox'))).toEqual([])
    })

    it('flags any explicit role on a multiple <select>', () => {
      const [result] = roleNotPermittedRule(
        ctx('select', { multiple: true, role: 'menu' }, 'listbox'),
      )
      expect(result).toMatchObject({ valid: false, fixable: true })
    })

    it('flags any explicit role on a <select size="4">', () => {
      const [result] = roleNotPermittedRule(ctx('select', { size: 4, role: 'menu' }, 'listbox'))
      expect(result).toMatchObject({ valid: false })
    })
  })

  // ─── F6: <img> with no alt attribute ───

  describe('img with no alt attribute permits only none/presentation (F6)', () => {
    it('flags a named-set role on an <img> with no alt', () => {
      const [result] = roleNotPermittedRule(ctx('img', { role: 'button' }, 'img'))
      expect(result).toMatchObject({ valid: false, fixable: true })
    })

    it('permits none/presentation on an <img> with no alt', () => {
      expect(roleNotPermittedRule(ctx('img', { role: 'none' }, 'img'))).toEqual([])
      expect(roleNotPermittedRule(ctx('img', { role: 'presentation' }, 'img'))).toEqual([])
    })
  })
})
