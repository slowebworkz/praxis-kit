import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AnyRecord } from '@praxis-kit/core'
import type { ConformanceAdapter, ConformanceComponent, ConformanceFactoryOptions } from '../types'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'
import { dynamic } from '@praxis-kit/primitive'
export type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceAdapter,
  ConformanceComponent,
  ConformanceFactoryOptions,
  ConformanceRef,
  RenderResult,
} from '../types'

export function conformanceSuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  const caps = {
    asChild: true,
    compose: true,
    compositionStyling: false,
    tagPolymorphism: true,
    domPropFiltering: true,
    dynamicChildRules: false,
    ...adapter.capabilities,
  }

  beforeEach(() => adapter.setup())
  afterEach(() => adapter.cleanup())

  // ── displayName ──────────────────────────────────────────────────────────────

  describe('conformance — displayName', () => {
    it('sets displayName from name option', () => {
      const Comp = adapter.createComponent({ name: 'MyBox' })
      expect(Comp.displayName).toBe('MyBox')
    })

    it('defaults to PolymorphicComponent', () => {
      const Comp = adapter.createComponent({})
      expect(Comp.displayName).toBe('PolymorphicComponent')
    })
  })

  // ── tag rendering ─────────────────────────────────────────────────────────────

  if (caps.tagPolymorphism)
    describe('conformance — tag rendering', () => {
      it('renders default tag (div)', () => {
        const Box = adapter.createComponent({})
        const { element } = adapter.render(Box)
        expect(element.tagName.toLowerCase()).toBe('div')
      })

      it('renders a different tag via the as prop', () => {
        const Box = adapter.createComponent({})
        const { element } = adapter.render(Box, { as: 'section' })
        expect(element.tagName.toLowerCase()).toBe('section')
      })

      it('respects a custom tag option', () => {
        const Box = adapter.createComponent({ tag: 'span' })
        const { element } = adapter.render(Box)
        expect(element.tagName.toLowerCase()).toBe('span')
      })
    })

  // ── class merging ─────────────────────────────────────────────────────────────

  describe('conformance — class merging', () => {
    it('applies base class', () => {
      const Box = adapter.createComponent({ styling: { base: 'base-cls' } })
      const { element } = adapter.render(Box)
      expect(element.className).toContain('base-cls')
    })

    it('merges caller class with base class', () => {
      const Box = adapter.createComponent({ styling: { base: 'base' } })
      const { element } = adapter.render(Box, { class: 'extra' })
      expect(element.className).toContain('base')
      expect(element.className).toContain('extra')
    })
  })

  // ── style forwarding ──────────────────────────────────────────────────────────

  describe('conformance — style forwarding', () => {
    it('applies an inline style object', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { style: { color: 'red' } })
      expect(element.style.color).toBe('red')
    })
  })

  // ── prop forwarding ───────────────────────────────────────────────────────────

  describe('conformance — prop forwarding', () => {
    it('forwards extra attributes to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'data-testid': 'box' })
      expect(element.getAttribute('data-testid')).toBe('box')
    })

    if (caps.domPropFiltering)
      it('strips variant keys before DOM forwarding', () => {
        const Box = adapter.createComponent({
          styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        })
        const { element } = adapter.render(Box, { size: 'lg' })
        expect(element.getAttribute('size')).toBeNull()
      })

    if (caps.domPropFiltering)
      it('custom filterProps strips matching keys', () => {
        const Box = adapter.createComponent({
          filterProps: (key) => key === 'loading',
        })
        const { element } = adapter.render(Box, { loading: 'true', 'data-keep': 'yes' })
        expect(element.getAttribute('loading')).toBeNull()
        expect(element.getAttribute('data-keep')).toBe('yes')
      })
  })

  // ── prop normalization ordering ──────────────────────────────────────────────

  describe('conformance — prop normalization ordering', () => {
    it("a normalize option observes the HTML built-in normalizers' output", () => {
      // On <button>, the built-in `disabledProps` sets aria-disabled="true" when
      // `disabled` is present. Every adapter (and the SSR path) must run the
      // caller's `normalize` *after* the HTML built-ins, so it can see that
      // value — the ordering React documents. When the order is reversed,
      // `normalize` runs first, sees no aria-disabled, and the marker is absent.
      const Btn = adapter.createComponent({
        tag: 'button',
        normalize: (props: AnyRecord) =>
          props['aria-disabled'] === 'true' ? { ...props, 'data-observed-aria': 'yes' } : props,
      })
      const { element } = adapter.render(Btn, { disabled: true })
      expect(element.getAttribute('data-observed-aria')).toBe('yes')
    })
  })

  // ── ARIA forwarding ───────────────────────────────────────────────────────────

  describe('conformance — ARIA forwarding', () => {
    it('forwards aria-label to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-label': 'Close' })
      expect(element.getAttribute('aria-label')).toBe('Close')
    })

    it('forwards aria-describedby to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-describedby': 'hint' })
      expect(element.getAttribute('aria-describedby')).toBe('hint')
    })

    it('forwards a non-redundant role to the DOM element', () => {
      // 'dialog' is not the implicit role of a div — it must be forwarded.
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { role: 'dialog' })
      expect(element.getAttribute('role')).toBe('dialog')
    })
  })

  // ── event forwarding ──────────────────────────────────────────────────────────

  describe('conformance — event forwarding', () => {
    it('fires onClick handler', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onClick: () => {
          called = true
        },
      })
      element.click()
      expect(called).toBe(true)
    })

    it('fires onFocus handler', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onFocus: () => {
          called = true
        },
      })
      // React/Preact compat listen on focusin; Vue listens on native focus
      element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      element.dispatchEvent(new FocusEvent('focus'))
      expect(called).toBe(true)
    })

    it('fires onBlur handler', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onBlur: () => {
          called = true
        },
      })
      // React/Preact compat listen on focusout; Vue listens on native blur
      element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      element.dispatchEvent(new FocusEvent('blur'))
      expect(called).toBe(true)
    })
  })

  // ── ref forwarding ────────────────────────────────────────────────────────────

  if (adapter.createRef) {
    describe('conformance — ref forwarding', () => {
      it('forwards ref to the DOM element', () => {
        const ref = adapter.createRef!()
        const Box = adapter.createComponent({})
        adapter.render(Box, { ref })
        expect(ref.current).toBeInstanceOf(HTMLElement)
      })

      it('forwards ref when rendered as a different tag', () => {
        const ref = adapter.createRef!()
        const Box = adapter.createComponent({})
        adapter.render(Box, { as: 'button', ref })
        expect(ref.current).toBeInstanceOf(HTMLElement)
        expect(ref.current!.tagName.toLowerCase()).toBe('button')
      })

      if (caps.asChild)
        it('forwards ref through asChild to the inner element', () => {
          const ref = adapter.createRef!()
          const Box = adapter.createComponent({})
          adapter.render(Box, { asChild: true, ref }, [{ tag: 'button' }])
          expect(ref.current).toBeInstanceOf(HTMLElement)
          expect(ref.current!.tagName.toLowerCase()).toBe('button')
        })
    })
  }

  // ── children ──────────────────────────────────────────────────────────────────

  describe('conformance — children', () => {
    it('renders children', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {}, [{ tag: 'span', props: { id: 'child' } }])
      expect(element.querySelector('span#child')).toBeTruthy()
    })
  })

  // ── asChild ───────────────────────────────────────────────────────────────────

  if (caps.asChild)
    describe('conformance — asChild', () => {
      it('renders the child element type instead of the default tag', () => {
        const Box = adapter.createComponent({})
        const { element } = adapter.render(Box, { asChild: true }, [{ tag: 'button' }])
        expect(element.tagName.toLowerCase()).toBe('button')
      })

      it('merges base class onto the asChild element', () => {
        const Box = adapter.createComponent({ styling: { base: 'box-cls' } })
        const { element } = adapter.render(Box, { asChild: true }, [{ tag: 'button' }])
        expect(element.className).toContain('box-cls')
      })

      it('throws when asChild has zero children', () => {
        const Box = adapter.createComponent({})
        expect(() => adapter.render(Box, { asChild: true }, [])).toThrow()
      })

      it('throws when asChild has multiple children', () => {
        const Box = adapter.createComponent({})
        expect(() =>
          adapter.render(Box, { asChild: true }, [{ tag: 'span' }, { tag: 'span' }]),
        ).toThrow()
      })

      it('throws when as and asChild are both provided', () => {
        const Box = adapter.createComponent({})
        expect(() => adapter.render(Box, { as: 'button', asChild: true }, [{ tag: 'a' }])).toThrow()
      })

      it('nested asChild: composes classes from both components onto the inner element', () => {
        const BoxA = adapter.createComponent({ styling: { base: 'class-a' } })
        const BoxB = adapter.createComponent({ styling: { base: 'class-b' } })
        // <BoxA asChild><BoxB asChild><button /></BoxB></BoxA>
        const { element } = adapter.render(BoxA, { asChild: true }, [
          { component: BoxB, props: { asChild: true }, children: [{ tag: 'button' }] },
        ])
        expect(element.className).toContain('class-a')
        expect(element.className).toContain('class-b')
        expect(element.tagName.toLowerCase()).toBe('button')
      })
    })

  // ── compose ───────────────────────────────────────────────────────────────────
  //
  // compose: { with: Component } makes a component always render composed `asChild` into
  // `with`, as if the consumer had hand-written the exact nested-`asChild` shape the suite
  // above already proves works — these tests assert `compose` produces identical output,
  // not a new mechanism. No `ChildSpec`/render-function support is needed from the harness
  // (the consumer never supplies children), so this runs for every adapter registered here,
  // including ones that set `asChild: false` for harness-compatibility reasons (Solid, Svelte).

  if (caps.compose)
    describe('conformance — compose', () => {
      it('renders through "with", composing classes the same way nested asChild does', () => {
        const BoxA = adapter.createComponent({ styling: { base: 'class-a' } })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA },
          styling: { base: 'class-b' },
        })
        const { element } = adapter.render(BoxB)
        expect(element.className).toContain('class-a')
        expect(element.className).toContain('class-b')
      })

      if (caps.tagPolymorphism)
        it("when both components declare a tag, the composing component's own tag wins", () => {
          const BoxA = adapter.createComponent({ tag: 'nav', styling: { base: 'class-a' } })
          const BoxB = adapter.createComponent({
            tag: 'button',
            compose: { with: BoxA },
            styling: { base: 'class-b' },
          })
          const { element } = adapter.render(BoxB)
          expect(element.tagName.toLowerCase()).toBe('button')
        })

      it('consumer props land on the composing component itself, not on "with"', () => {
        const BoxA = adapter.createComponent({})
        const BoxB = adapter.createComponent({ compose: { with: BoxA } })
        const { element } = adapter.render(BoxB, { 'data-testid': 'inner' })
        expect(element.getAttribute('data-testid')).toBe('inner')
      })

      if (caps.asChild)
        it('an explicit asChild from the consumer wins over compose', () => {
          const BoxA = adapter.createComponent({ styling: { base: 'class-a' } })
          const BoxB = adapter.createComponent({
            compose: { with: BoxA },
            styling: { base: 'class-b' },
          })
          const { element } = adapter.render(BoxB, { asChild: true }, [{ tag: 'a' }])
          expect(element.tagName.toLowerCase()).toBe('a')
          expect(element.className).toContain('class-b')
          expect(element.className).not.toContain('class-a')
        })

      if (adapter.createRef)
        it("forwards ref through compose to the composing component's own real element", () => {
          const ref = adapter.createRef!()
          const BoxA = adapter.createComponent({ tag: 'nav' })
          const BoxB = adapter.createComponent({ tag: 'button', compose: { with: BoxA } })
          adapter.render(BoxB, { ref })
          expect(ref.current).toBeInstanceOf(HTMLElement)
          expect(ref.current!.tagName.toLowerCase()).toBe('button')
        })

      it('without allProps, a variant the partner declares is still selected on the composing component', () => {
        // `allProps` gates raw prop forwarding only; the partner's styling variants are part of
        // the composing component's public surface whenever `compose.with` exists.
        const BoxA = adapter.createComponent({
          styling: { variants: { intent: { ghost: 'intent-ghost' } } },
        })
        const BoxB = adapter.createComponent({ compose: { with: BoxA } })
        const { element } = adapter.render(BoxB, { intent: 'ghost' })
        expect(element.className).toContain('intent-ghost')
      })

      it('with allProps: true, "with" resolves its own variants from the forwarded props', () => {
        const BoxA = adapter.createComponent({
          styling: { variants: { intent: { ghost: 'intent-ghost' } } },
        })
        const BoxB = adapter.createComponent({ compose: { with: BoxA, allProps: true } })
        const { element } = adapter.render(BoxB, { intent: 'ghost' })
        expect(element.className).toContain('intent-ghost')
      })

      it('resolves compound variants declared on the composing parent', () => {
        const BoxA = adapter.createComponent({ styling: { base: 'child-base' } })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA },
          styling: {
            variants: {
              intent: { ghost: 'parent-intent-ghost', solid: 'parent-intent-solid' },
              size: { lg: 'parent-size-lg', sm: 'parent-size-sm' },
            },
            compounds: [{ intent: 'ghost', size: 'lg', class: 'parent-compound-ghost-lg' }],
          },
        })

        const { element } = adapter.render(BoxB, { intent: 'ghost', size: 'lg' })
        expect(element.className).toContain('parent-compound-ghost-lg')
        expect(element.className).toContain('child-base')
      })

      it('resolves child compound variants from compose.defaults', () => {
        const BoxA = adapter.createComponent({
          styling: {
            variants: {
              intent: { ghost: 'child-intent-ghost', solid: 'child-intent-solid' },
              size: { lg: 'child-size-lg', sm: 'child-size-sm' },
            },
            compounds: [{ intent: 'ghost', size: 'lg', class: 'child-compound-ghost-lg' }],
          },
        })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA, defaults: { intent: 'ghost', size: 'lg' } },
        })

        const { element } = adapter.render(BoxB)
        expect(element.className).toContain('child-compound-ghost-lg')
      })

      it('resolves child compound variants from forwarded props when allProps is enabled', () => {
        const BoxA = adapter.createComponent({
          styling: {
            variants: {
              intent: { ghost: 'child-intent-ghost', solid: 'child-intent-solid' },
              size: { lg: 'child-size-lg', sm: 'child-size-sm' },
            },
            compounds: [{ intent: 'ghost', size: 'lg', class: 'child-compound-ghost-lg' }],
          },
        })
        const BoxB = adapter.createComponent({ compose: { with: BoxA, allProps: true } })

        const { element } = adapter.render(BoxB, { intent: 'ghost', size: 'lg' })
        expect(element.className).toContain('child-compound-ghost-lg')
      })

      it('resolves child compounds from selected partner variants when allProps is disabled', () => {
        const BoxA = adapter.createComponent({
          styling: {
            variants: {
              intent: { ghost: 'child-intent-ghost' },
              size: { lg: 'child-size-lg' },
            },
            compounds: [{ intent: 'ghost', size: 'lg', class: 'child-compound-ghost-lg' }],
          },
        })
        const BoxB = adapter.createComponent({ compose: { with: BoxA } })

        const { element } = adapter.render(BoxB, { intent: 'ghost', size: 'lg' })
        expect(element.className).toContain('child-compound-ghost-lg')
      })

      it('matches child compounds using both defaults and forwarded props', () => {
        const BoxA = adapter.createComponent({
          styling: {
            variants: {
              intent: { ghost: 'child-intent-ghost', solid: 'child-intent-solid' },
              size: { lg: 'child-size-lg', sm: 'child-size-sm' },
            },
            compounds: [{ intent: 'ghost', size: 'lg', class: 'child-compound-ghost-lg' }],
          },
        })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA, allProps: true, defaults: { intent: 'ghost' } },
        })

        const { element } = adapter.render(BoxB, { size: 'lg' })
        expect(element.className).toContain('child-compound-ghost-lg')
      })

      it('applies compose.defaults to the composed component', () => {
        const BoxA = adapter.createComponent({
          styling: { variants: { intent: { ghost: 'intent-ghost', solid: 'intent-solid' } } },
        })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA, defaults: { intent: 'ghost' } },
        })
        const { element } = adapter.render(BoxB)
        expect(element.className).toContain('intent-ghost')
      })

      it('applies multiple compose.defaults together', () => {
        const BoxA = adapter.createComponent({
          styling: {
            variants: {
              intent: { ghost: 'intent-ghost', solid: 'intent-solid' },
              size: { sm: 'size-sm', lg: 'size-lg' },
            },
          },
        })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA, defaults: { intent: 'ghost', size: 'lg' } },
        })
        const { element } = adapter.render(BoxB)
        expect(element.className).toContain('intent-ghost')
        expect(element.className).toContain('size-lg')
      })

      it('allows partial compose.defaults without defaulting unspecified variants', () => {
        const BoxA = adapter.createComponent({
          styling: {
            variants: {
              intent: { ghost: 'intent-ghost', solid: 'intent-solid' },
              size: { sm: 'size-sm', lg: 'size-lg' },
            },
          },
        })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA, defaults: { intent: 'ghost' } },
        })
        const { element } = adapter.render(BoxB)
        expect(element.className).toContain('intent-ghost')
        expect(element.className).not.toContain('size-sm')
        expect(element.className).not.toContain('size-lg')
      })

      it('forwards allProps over compose.defaults when both specify the same prop', () => {
        const BoxA = adapter.createComponent({
          styling: { variants: { intent: { ghost: 'intent-ghost', solid: 'intent-solid' } } },
        })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA, allProps: true, defaults: { intent: 'ghost' } },
        })
        const { element } = adapter.render(BoxB, { intent: 'solid' })
        expect(element.className).toContain('intent-solid')
        expect(element.className).not.toContain('intent-ghost')
      })

      it('with allProps: true, explicit asChild/ref/children still win over forwarded props', () => {
        const BoxA = adapter.createComponent({ tag: 'nav' })
        const BoxB = adapter.createComponent({
          tag: 'button',
          compose: { with: BoxA, allProps: true },
        })
        const { element } = adapter.render(BoxB, { 'data-testid': 'inner' })
        expect(element.tagName.toLowerCase()).toBe('button')
        expect(element.getAttribute('data-testid')).toBe('inner')
      })

      it('delivers a handler to the composing component exactly once, with or without allProps', () => {
        for (const allProps of [true, false]) {
          const BoxA = adapter.createComponent({})
          const BoxB = adapter.createComponent({ compose: { with: BoxA, allProps } })
          let calls = 0
          const { element } = adapter.render(BoxB, {
            onClick: () => {
              calls++
            },
          })
          element.click()
          expect(calls, `allProps: ${allProps}`).toBe(1)
        }
      })

      it('does not warn for an empty compose configuration', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          adapter.createComponent({
            enforcement: { diagnostics: warnDiagnostics },
            // Empty compose is inert and should not trigger incomplete-config diagnostics.
            compose: {} as unknown as NonNullable<ConformanceFactoryOptions['compose']>,
          })
          expect(warnSpy).not.toHaveBeenCalled()
        } finally {
          warnSpy.mockRestore()
        }
      })

      it('warns at construction when compose options are supplied without "with"', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          adapter.createComponent({
            enforcement: { diagnostics: warnDiagnostics },
            // Deliberately incomplete: the type requires `with`, the runtime diagnostic covers JS callers.
            compose: { allProps: true } as unknown as NonNullable<
              ConformanceFactoryOptions['compose']
            >,
          })
          const output = warnSpy.mock.calls.flat().join(' ')
          expect(output).toContain('compose.allProps has no effect without compose.with')
        } finally {
          warnSpy.mockRestore()
        }
      })

      it('diagnoses compose.defaults even when the supplied defaults object is empty', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          adapter.createComponent({
            enforcement: { diagnostics: warnDiagnostics },
            compose: { defaults: {} } as unknown as NonNullable<
              ConformanceFactoryOptions['compose']
            >,
          })
          const output = warnSpy.mock.calls.flat().join(' ')
          expect(output).toContain('compose.defaults has no effect without compose.with')
        } finally {
          warnSpy.mockRestore()
        }
      })

      it('reports both composition-only options in one diagnostic when with is missing', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          adapter.createComponent({
            enforcement: { diagnostics: warnDiagnostics },
            compose: { allProps: false, defaults: {} } as unknown as NonNullable<
              ConformanceFactoryOptions['compose']
            >,
          })
          const output = warnSpy.mock.calls.flat().join(' ')
          expect(warnSpy).toHaveBeenCalledTimes(1)
          expect(output).toContain(
            'compose.allProps and compose.defaults have no effect without compose.with',
          )
        } finally {
          warnSpy.mockRestore()
        }
      })
    })

  // ── composition styling ────────────────────────────────────────────────────────

  if (caps.compositionStyling)
    describe('conformance — composition styling', () => {
      if (caps.asChild)
        it('uses ordinary primary styling when explicit asChild overrides composition', () => {
          const Surface = adapter.createComponent({
            styling: {
              base: 'partner-base',
              variants: { intent: { ghost: 'partner-intent-ghost' } },
            },
          })
          const Card = adapter.createComponent({
            compose: { with: Surface },
            styling: {
              base: 'primary-base',
              variants: { size: { lg: 'primary-size-lg' } },
            },
          })

          const { element } = adapter.render(
            Card,
            { asChild: true, intent: 'ghost', size: 'lg' },
            [{ tag: 'button' }],
          )

          expect(element.tagName.toLowerCase()).toBe('button')
          expect(element.className).toContain('primary-base')
          expect(element.className).toContain('primary-size-lg')
          expect(element.className).not.toContain('partner-base')
          expect(element.className).not.toContain('partner-intent-ghost')
        })

      it('combines partner and primary classes in the specified contribution order', () => {
        const Surface = adapter.createComponent({
          styling: {
            base: 'partner-base',
            variants: { intent: { ghost: 'partner-intent-ghost' } },
            compounds: [{ intent: 'ghost', class: 'partner-compound-ghost' }],
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface, defaults: { intent: 'ghost' } },
          styling: {
            base: 'primary-base',
            variants: { size: { lg: 'primary-size-lg' } },
            compounds: [{ size: 'lg', class: 'primary-compound-lg' }],
          },
        })

        const { element } = adapter.render(Card, { size: 'lg', class: 'caller-class' })
        const className = element.className
        const orderedClasses = [
          'partner-base',
          'primary-base',
          'partner-intent-ghost',
          'primary-size-lg',
          'partner-compound-ghost',
          'primary-compound-lg',
          'caller-class',
        ]
        let previousIndex = -1

        for (const classNamePart of orderedClasses) {
          const index = className.indexOf(classNamePart)
          expect(index, `${classNamePart} should be present`).toBeGreaterThanOrEqual(0)
          expect(index, `${classNamePart} should follow the previous contribution`).toBeGreaterThan(
            previousIndex,
          )
          previousIndex = index
        }
      })

      it('combines partner and primary tag-map classes for the rendered tag', () => {
        const Surface = adapter.createComponent({
          tag: 'section',
          styling: { tags: { section: 'partner-section' } },
        })
        const Card = adapter.createComponent({
          tag: 'section',
          compose: { with: Surface },
          styling: { tags: { section: 'primary-section' } },
        })

        const { element } = adapter.render(Card)

        expect(element.tagName.toLowerCase()).toBe('section')
        expect(element.className).toContain('partner-section')
        expect(element.className).toContain('primary-section')
      })

      it('uses primary defaults over compose.defaults for compatible shared variants', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: { intent: { ghost: 'partner-ghost', solid: 'partner-solid' } },
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface, defaults: { intent: 'ghost' } },
          styling: {
            variants: { intent: { ghost: 'primary-ghost', solid: 'primary-solid' } },
            defaults: { intent: 'solid' },
          },
        })

        const { element } = adapter.render(Card)
        expect(element.className).toContain('partner-solid')
        expect(element.className).toContain('primary-solid')
        expect(element.className).not.toContain('partner-ghost')
        expect(element.className).not.toContain('primary-ghost')
      })

      it('resolves a partner-only recipe while a handler forwarded through allProps fires once', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
            presets: { emphasis: { tone: 'loud' } },
          },
        })
        // The primary defines no `emphasis` preset: the recipe belongs to the partner alone.
        const Card = adapter.createComponent({
          compose: { with: Surface, allProps: true },
          styling: { base: 'primary-base' },
        })
        let calls = 0

        const { element } = adapter.render(Card, {
          recipe: 'emphasis',
          onClick: () => {
            calls++
          },
        })
        element.click()

        expect(element.className).toContain('partner-loud')
        expect(element.className).toContain('primary-base')
        expect(element.className).not.toContain('partner-quiet')
        expect(calls).toBe(1)
      })

      it('merges partner and primary recipes with primary values winning duplicate keys', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: {
              tone: { quiet: 'partner-quiet', loud: 'partner-loud' },
              size: { sm: 'partner-sm', lg: 'partner-lg' },
            },
            presets: { emphasis: { tone: 'quiet', size: 'lg' } },
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          styling: {
            variants: {
              tone: { quiet: 'primary-quiet', loud: 'primary-loud' },
              density: { compact: 'primary-compact', spacious: 'primary-spacious' },
            },
            presets: { emphasis: { tone: 'loud', density: 'compact' } },
          },
        })

        const { element } = adapter.render(Card, { recipe: 'emphasis' })

        // The primary recipe wins the shared `tone` key; unique recipe keys still merge.
        expect(element.className).toContain('partner-loud')
        expect(element.className).toContain('primary-loud')
        expect(element.className).toContain('partner-lg')
        expect(element.className).toContain('primary-compact')
        expect(element.className).not.toContain('partner-quiet')
        expect(element.className).not.toContain('primary-quiet')
      })

      it('resolves a partner-only recipe without allProps when its variant is undefined', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
            presets: { emphasis: { tone: 'loud' } },
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          styling: { base: 'primary-base' },
        })

        const { element } = adapter.render(Card, { recipe: 'emphasis', tone: undefined })
        expect(element.className).toContain('partner-loud')
        expect(element.className).toContain('primary-base')
        expect(element.className).not.toContain('partner-quiet')
      })

      it('follows the documented precedence: explicit > recipe > primary default > compose.defaults > partner default', () => {
        const tone = (quiet: string, loud: string) => ({ tone: { quiet, loud } })
        const Surface = adapter.createComponent({
          styling: {
            variants: tone('partner-quiet', 'partner-loud'),
            defaults: { tone: 'quiet' },
            presets: { emphasis: { tone: 'loud' } },
          },
        })
        const card = (composeDefaults?: object, primaryDefault?: 'quiet' | 'loud') =>
          adapter.createComponent({
            compose: { with: Surface, ...(composeDefaults && { defaults: composeDefaults }) },
            styling: {
              variants: tone('primary-quiet', 'primary-loud'),
              ...(primaryDefault && { defaults: { tone: primaryDefault } }),
            },
          })
        const classes = (Card: ReturnType<typeof card>, props: Record<string, unknown> = {}) => {
          const { element, unmount } = adapter.render(Card, props)
          const value = element.className
          unmount()
          return value
        }

        // 5. partner default, with nothing else selecting the variant
        expect(classes(card())).toContain('partner-quiet')
        // 4. compose.defaults beats the partner default
        expect(classes(card({ tone: 'loud' }))).toContain('partner-loud')
        // 3. a primary default beats compose.defaults
        const primaryDefault = classes(card({ tone: 'loud' }, 'quiet'))
        expect(primaryDefault).toContain('partner-quiet')
        expect(primaryDefault).toContain('primary-quiet')
        expect(primaryDefault).not.toContain('loud')
        // 2. a recipe beats a primary default
        const recipe = classes(card({ tone: 'quiet' }, 'quiet'), { recipe: 'emphasis' })
        expect(recipe).toContain('partner-loud')
        expect(recipe).not.toContain('partner-quiet')
        // 1. an explicit selection beats a recipe
        const explicit = classes(card({ tone: 'loud' }, 'loud'), {
          recipe: 'emphasis',
          tone: 'quiet',
        })
        expect(explicit).toContain('partner-quiet')
        expect(explicit).toContain('primary-quiet')
        expect(explicit).not.toContain('loud')
      })

      it('uses the primary definition for incompatible variants and diagnoses once at construction', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          const Surface = adapter.createComponent({
            styling: {
              variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
            },
          })
          const Card = adapter.createComponent({
            compose: { with: Surface },
            enforcement: { diagnostics: warnDiagnostics },
            styling: {
              variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } },
              defaults: { tone: 'bold' },
            },
          })

          const constructionWarnings = warnSpy.mock.calls.flat().join(' ')
          expect(constructionWarnings).toContain('Incompatible composed variant "tone"')

          const { element } = adapter.render(Card)
          expect(element.className).toContain('primary-bold')
          expect(element.className).not.toContain('partner-')
          expect(warnSpy).toHaveBeenCalledTimes(1)
        } finally {
          warnSpy.mockRestore()
        }
      })

      it('keeps the primary default when a partner recipe selects a value outside the primary variant definition', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
            presets: { emphasis: { tone: 'loud' } },
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          enforcement: { diagnostics: silentDiagnostics },
          styling: {
            variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } },
            defaults: { tone: 'bold' },
          },
        })

        const { element } = adapter.render(Card, { recipe: 'emphasis' })
        expect(element.className).toContain('primary-bold')
        expect(element.className).not.toContain('partner-')
      })

      it('does not let an unsupported value activate a partner compound on an incompatible variant', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: {
              tone: { quiet: 'partner-quiet', loud: 'partner-loud' },
              size: { sm: 'partner-sm', lg: 'partner-lg' },
            },
            compounds: [
              { tone: 'loud', class: 'partner-compound-loud' },
              { size: 'lg', class: 'partner-compound-lg' },
            ],
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          enforcement: { diagnostics: silentDiagnostics },
          styling: { variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } } },
        })

        // `tone` is incompatible (the primary definition wins), so a raw `loud` must not reach the
        // partner's compound; a compound on the compatible, partner-only `size` still works.
        const unsupported = adapter.render(Card, { tone: 'loud' })
        expect(unsupported.element.className).not.toContain('partner-compound-loud')
        unsupported.unmount()

        const { element } = adapter.render(Card, { size: 'lg' })
        expect(element.className).toContain('partner-compound-lg')
      })

      it('narrows partner compound arrays to values supported by the primary variant', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: {
              tone: { calm: 'partner-calm', loud: 'partner-loud', quiet: 'partner-quiet' },
              size: { sm: 'partner-sm', lg: 'partner-lg' },
            },
            compounds: [
              { tone: ['calm', 'loud'], size: 'lg', class: 'partner-compound-supported-array' },
              { tone: ['loud', 'quiet'], class: 'partner-compound-unsupported-array' },
            ],
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          enforcement: { diagnostics: silentDiagnostics },
          styling: {
            variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } },
          },
        })

        const supported = adapter.render(Card, { tone: 'calm', size: 'lg' })
        expect(supported.element.className).toContain('partner-compound-supported-array')
        expect(supported.element.className).not.toContain('partner-compound-unsupported-array')
        supported.unmount()

        const unsupported = adapter.render(Card, { tone: 'loud', size: 'lg' })
        expect(unsupported.element.className).not.toContain('partner-compound-supported-array')
        expect(unsupported.element.className).not.toContain('partner-compound-unsupported-array')
      })

      if (adapter.createExternalPartner)
        it('falls back to nested rendering for a target without retained Praxis styling metadata', () => {
          const External = adapter.createExternalPartner!()
          const Card = adapter.createComponent({
            compose: { with: External as never },
            styling: { base: 'primary-base', variants: { size: { lg: 'primary-size-lg' } } },
          })

          const { element } = adapter.render(Card, { size: 'lg', class: 'caller-class' })

          expect(element).toBeTruthy()
          expect(element.className).toContain('primary-base')
          expect(element.className).toContain('primary-size-lg')
          expect(element.className).toContain('caller-class')
        })

      it('keeps ordinary styling when allProps is supplied without a composition target', () => {
        const Box = adapter.createComponent({
          compose: { allProps: true } as unknown as NonNullable<ConformanceFactoryOptions['compose']>,
          styling: {
            base: 'primary-base',
            variants: { tone: { quiet: 'primary-quiet', loud: 'primary-loud' } },
            defaults: { tone: 'quiet' },
          },
        })

        const { element } = adapter.render(Box, { tone: 'loud' })

        expect(element.className).toContain('primary-base')
        expect(element.className).toContain('primary-loud')
        expect(element.className).not.toContain('primary-quiet')
      })

      it('activates partner variants selected on the composing component without allProps', () => {
        const Surface = adapter.createComponent({
          styling: {
            variants: { intent: { ghost: 'partner-intent-ghost' } },
            compounds: [{ intent: 'ghost', class: 'partner-compound-ghost' }],
          },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          styling: { variants: { size: { lg: 'primary-size-lg' } } },
        })

        const { element } = adapter.render(Card, { intent: 'ghost', size: 'lg' })
        expect(element.className).toContain('primary-size-lg')
        expect(element.className).toContain('partner-intent-ghost')
        expect(element.className).toContain('partner-compound-ghost')
      })

      it('does not turn an unrelated, non-variant prop into a styling input', () => {
        const Surface = adapter.createComponent({
          styling: { variants: { intent: { ghost: 'partner-intent-ghost' } } },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          styling: { base: 'primary-base' },
        })

        const { element } = adapter.render(Card, { notAVariant: 'ghost' })
        expect(element.className).toContain('primary-base')
        expect(element.className).not.toContain('partner-intent-ghost')
      })
    })

  // ── variants ──────────────────────────────────────────────────────────────────

  describe('conformance — variants', () => {
    it('applies variant class via default', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { intent: { primary: 'bg-blue', secondary: 'bg-gray' } },
          defaults: { intent: 'primary' },
        },
      })
      const { element } = adapter.render(Box)
      expect(element.className).toContain('bg-blue')
    })

    it('applies variant class from prop', () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      })
      const { element } = adapter.render(Box, { size: 'lg' })
      expect(element.className).toContain('text-lg')
    })

    it('applies compound class when all conditions are met', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: 'btn-primary', secondary: 'btn-secondary' },
            size: { sm: 'btn-sm', lg: 'btn-lg' },
          },
          compounds: [{ intent: 'primary', size: 'lg', class: 'btn-primary-lg' }],
        },
      })
      const { element } = adapter.render(Box, { intent: 'primary', size: 'lg' })
      expect(element.className).toContain('btn-primary-lg')
    })

    it('does not apply compound class when only some conditions are met', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: 'btn-primary', secondary: 'btn-secondary' },
            size: { sm: 'btn-sm', lg: 'btn-lg' },
          },
          compounds: [{ intent: 'primary', size: 'lg', class: 'btn-primary-lg' }],
        },
      })
      const { element } = adapter.render(Box, { intent: 'primary', size: 'sm' })
      expect(element.className).not.toContain('btn-primary-lg')
    })

    it('activates a preset via recipe', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: 'bg-blue', secondary: 'bg-gray' },
            size: { sm: 'text-sm', lg: 'text-lg' },
          },
          presets: { cta: { intent: 'primary', size: 'lg' } },
        },
      })
      const { element } = adapter.render(Box, { recipe: 'cta' })
      expect(element.className).toContain('bg-blue')
      expect(element.className).toContain('text-lg')
    })
  })

  // ── enforcement ───────────────────────────────────────────────────────────────

  describe('conformance — enforcement', () => {
    it('throws when children count is below min (throwDiagnostics)', () => {
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [
            { name: 'Item', match: (c): c is unknown => !!c || !c, cardinality: { min: 2 } },
          ],
        },
      })
      // 1 child provided; rule requires at least 2
      expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).toThrow()
    })

    it('throws when children count exceeds max (throwDiagnostics)', () => {
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [
            { name: 'Item', match: (c): c is unknown => !!c || !c, cardinality: { max: 2 } },
          ],
        },
      })
      // 3 children provided; rule allows at most 2
      expect(() =>
        adapter.render(Group, {}, [{ tag: 'span' }, { tag: 'span' }, { tag: 'span' }]),
      ).toThrow()
    })

    it('warns but does not throw when warnDiagnostics', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: warnDiagnostics,
          children: [
            {
              name: 'Item',
              match: (c): c is unknown => !!c || !c,
              cardinality: { min: 2, max: 2 },
            },
          ],
        },
      })
      expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).not.toThrow()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('is silent when silentDiagnostics', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: silentDiagnostics,
          children: [
            {
              name: 'Item',
              match: (c): c is unknown => !!c || !c,
              cardinality: { min: 2, max: 2 },
            },
          ],
        },
      })
      expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).not.toThrow()
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  // ── dynamic(...) child rule cardinality ─────────────────────────────────────────

  if (caps.dynamicChildRules)
    describe('conformance — dynamic(...) child rule cardinality', () => {
      // Mirrors the forcing example for context-aware child enforcement: a
      // component whose `as` resolves to 'section' requires at least one Item,
      // but resolved to a plain 'div' makes Items optional.
      const dynamicCardinalityOptions = {
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [
            {
              name: 'Item',
              match: (c: unknown): c is unknown => !!c || !c,
              cardinality: dynamic((ctx: { tag: unknown }) =>
                ctx.tag === 'section' ? { min: 1 } : { min: 0 },
              ),
            },
          ],
        },
      }

      it('requires at least one child when the resolved tag is "section"', () => {
        const Group = adapter.createComponent(dynamicCardinalityOptions)
        expect(() => adapter.render(Group, { as: 'section' }, [])).toThrow()
        expect(() => adapter.render(Group, { as: 'section' }, [{ tag: 'span' }])).not.toThrow()
      })

      it('allows zero children when the resolved tag is "div"', () => {
        const Group = adapter.createComponent(dynamicCardinalityOptions)
        expect(() => adapter.render(Group, { as: 'div' }, [])).not.toThrow()
      })

      it('re-resolves on rerender when the tag changes', () => {
        const Group = adapter.createComponent(dynamicCardinalityOptions)
        const result = adapter.render(Group, { as: 'div' }, [])
        expect(() => result.rerender({ as: 'section' }, [])).toThrow()
      })
    })

  // ── reactivity ────────────────────────────────────────────────────────────────

  describe('conformance — reactivity', () => {
    it('updates class when variant prop changes on rerender', () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      })
      const result = adapter.render(Box, { size: 'sm' })
      expect(result.element.className).toContain('text-sm')
      result.rerender({ size: 'lg' })
      expect(result.element.className).toContain('text-lg')
    })

    if (caps.tagPolymorphism)
      it('switches rendered tag on rerender with a new as prop', () => {
        const Box = adapter.createComponent({})
        const result = adapter.render(Box, { as: 'div' })
        expect(result.element.tagName.toLowerCase()).toBe('div')
        result.rerender({ as: 'section' })
        expect(result.element.tagName.toLowerCase()).toBe('section')
      })
  })
}
