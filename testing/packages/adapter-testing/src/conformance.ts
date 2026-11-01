import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { createClassPipeline } from '@praxis-kit/core'
import type { AnyRecord, ClassPluginFactory } from '@praxis-kit/core'
import type { ConformanceAdapter, ConformanceComponent, ConformanceFactoryOptions } from './types'
import { expectClassNames } from './helpers'
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
} from './types'

// Minimal plugin used to exercise the real adapter composition path without coupling the
// adapter-utils test harness to a framework-specific plugin package. Its `flex` prop is an
// owned styling input: it affects the pipeline output but must never be forwarded as an attribute.
const compositionOwnedPropPlugin: ClassPluginFactory<{ flex?: boolean }> = (options) => {
  const resolveClasses = createClassPipeline(options)
  return {
    ownedKeys: new Set(['flex']),
    pipeline(tag, props, className, recipe) {
      const classes = resolveClasses(tag, props, className, recipe) ?? ''
      return props.flex === true ? [classes, 'plugin-flex'].filter(Boolean).join(' ') : classes
    },
  }
}

const tagOf = (element: Element): string => element.tagName.toLowerCase()

// A child-rule matcher that accepts every child, so a rule exercises cardinality alone.
const matchAnyChild = (c: unknown): c is unknown => !!c || !c

// Runs `run` with `console.warn` silenced and always restores it, even if an assertion throws.
function withWarnSpy(run: (warnSpy: MockInstance<typeof console.warn>) => void): void {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    run(warnSpy)
  } finally {
    warnSpy.mockRestore()
  }
}

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
        expect(tagOf(element)).toBe('div')
      })

      it('renders a different tag via the as prop', () => {
        const Box = adapter.createComponent({})
        const { element } = adapter.render(Box, { as: 'section' })
        expect(tagOf(element)).toBe('section')
      })

      it('respects a custom tag option', () => {
        const Box = adapter.createComponent({ tag: 'span' })
        const { element } = adapter.render(Box)
        expect(tagOf(element)).toBe('span')
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
      expectClassNames(element.className, { has: ['base', 'extra'] })
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
        expect(tagOf(ref.current!)).toBe('button')
      })

      if (caps.asChild)
        it('forwards ref through asChild to the inner element', () => {
          const ref = adapter.createRef!()
          const Box = adapter.createComponent({})
          adapter.render(Box, { asChild: true, ref }, [{ tag: 'button' }])
          expect(ref.current).toBeInstanceOf(HTMLElement)
          expect(tagOf(ref.current!)).toBe('button')
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
        expect(tagOf(element)).toBe('button')
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
        expectClassNames(element.className, { has: ['class-a', 'class-b'] })
        expect(tagOf(element)).toBe('button')
      })
    })

  // ── compose ───────────────────────────────────────────────────────────────────
  //
  // `compose.with` may use an internal asChild/slot path in an adapter, but its public contract
  // is distinct from explicit `asChild`: compose keeps element selection and `allowedAs` ownership
  // on the composing parent, while explicit `asChild` delegates element selection to its child.
  // These tests assert that public behavior, independent of the adapter's internal rendering path.
  // No `ChildSpec`/render-function support is needed for the basic compose cases, so this runs for
  // every adapter registered here, including ones that set `asChild: false` for harness
  // compatibility reasons (Solid, Svelte).

  if (caps.compose)
    describe('conformance — compose', () => {
      it('renders through "with", composing classes the same way nested asChild does', () => {
        const BoxA = adapter.createComponent({ styling: { base: 'class-a' } })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA },
          styling: { base: 'class-b' },
        })
        const { element } = adapter.render(BoxB)
        expectClassNames(element.className, { has: ['class-a', 'class-b'] })
      })

      if (caps.tagPolymorphism) {
        it("uses the composing parent's default tag even when the partner disallows it", () => {
          withWarnSpy((warnSpy) => {
            const Surface = adapter.createComponent({
              tag: 'nav',
              enforcement: {
                diagnostics: throwDiagnostics,
                allowedAs: ['nav', 'main'],
              },
              styling: { base: 'class-a' },
            })
            const Card = adapter.createComponent({
              tag: 'div',
              enforcement: {
                diagnostics: throwDiagnostics,
                allowedAs: ['div', 'article'],
              },
              compose: { with: Surface },
              styling: { base: 'class-b' },
            })

            const { element } = adapter.render(Card)
            expect(tagOf(element)).toBe('div')
            expect(warnSpy).not.toHaveBeenCalled()
          })
        })

        it.each([false, true])(
          'validates an explicit as override against the parent contract (allProps=%s)',
          (allProps) => {
            withWarnSpy((warnSpy) => {
              const Surface = adapter.createComponent({
                tag: 'section',
                enforcement: {
                  diagnostics: throwDiagnostics,
                  allowedAs: ['section', 'main'],
                },
              })
              const Card = adapter.createComponent({
                tag: 'div',
                enforcement: {
                  diagnostics: throwDiagnostics,
                  allowedAs: ['div', 'article'],
                },
                compose: { with: Surface, allProps },
              })

              const { element } = adapter.render(Card, { as: 'article' })
              expect(tagOf(element)).toBe('article')
              expect(element.hasAttribute('as')).toBe(false)
              expect(warnSpy).not.toHaveBeenCalled()
            })
          },
        )

        it('reports an explicit as value allowed only by the composed partner', () => {
          withWarnSpy((warnSpy) => {
            const Surface = adapter.createComponent({
              tag: 'section',
              enforcement: {
                diagnostics: warnDiagnostics,
                allowedAs: ['section', 'main'],
              },
            })
            const Card = adapter.createComponent({
              tag: 'div',
              enforcement: {
                diagnostics: warnDiagnostics,
                allowedAs: ['div', 'article'],
              },
              compose: { with: Surface },
            })

            adapter.render(Card, { as: 'main' })
            expect(warnSpy).toHaveBeenCalled()
            expect(warnSpy.mock.calls.flat().join(' ')).toMatch(
              /COMP1009.*"as" prop received "main"/,
            )
          })
        })
      }

      it('with allProps: true, consumes `as` on the composing component instead of forwarding it to `with`', () => {
        const Surface = adapter.createComponent({ tag: 'div' })
        const Card = adapter.createComponent({
          tag: 'article',
          compose: { with: Surface, allProps: true },
        })
        const { element } = adapter.render(Card, { as: 'section', 'data-testid': 'composed' })
        expect(tagOf(element)).toBe('section')
        expect(element.getAttribute('data-testid')).toBe('composed')
        expect(element.querySelector('[data-testid="composed"]')).toBeNull()
      })

      it('consumer props land on the composing component itself, not on "with"', () => {
        const BoxA = adapter.createComponent({})
        const BoxB = adapter.createComponent({ compose: { with: BoxA } })
        const { element } = adapter.render(BoxB, { 'data-testid': 'inner' })
        expect(element.getAttribute('data-testid')).toBe('inner')
      })

      if (caps.asChild) {
        it('an explicit asChild from the consumer wins over compose', () => {
          const BoxA = adapter.createComponent({ styling: { base: 'class-a' } })
          const BoxB = adapter.createComponent({
            compose: { with: BoxA },
            styling: { base: 'class-b' },
          })
          const { element } = adapter.render(BoxB, { asChild: true }, [{ tag: 'a' }])
          expect(tagOf(element)).toBe('a')
          expectClassNames(element.className, { has: ['class-b'], lacks: ['class-a'] })
        })

        if (caps.tagPolymorphism)
          it.each([
            { mode: 'the child default', childProps: {}, expectedTag: 'section' },
            { mode: 'the child as override', childProps: { as: 'main' }, expectedTag: 'main' },
          ])(
            'explicit asChild delegates $mode element selection to the child contract',
            ({ childProps, expectedTag }) => {
              withWarnSpy((warnSpy) => {
                const Surface = adapter.createComponent({
                  tag: 'section',
                  enforcement: {
                    diagnostics: throwDiagnostics,
                    allowedAs: ['section', 'main'],
                  },
                })
                const Partner = adapter.createComponent({ tag: 'nav' })
                const Card = adapter.createComponent({
                  tag: 'div',
                  enforcement: {
                    diagnostics: warnDiagnostics,
                    allowedAs: ['div', 'article'],
                  },
                  compose: { with: Partner },
                })

                const { element } = adapter.render(Card, { asChild: true }, [
                  { component: Surface, props: childProps },
                ])
                expect(tagOf(element)).toBe(expectedTag)
                expect(warnSpy).not.toHaveBeenCalled()
              })
            },
          )
      }

      if (adapter.createRef)
        it("forwards ref through compose to the composing component's own real element", () => {
          const ref = adapter.createRef!()
          const BoxA = adapter.createComponent({ tag: 'nav' })
          const BoxB = adapter.createComponent({ tag: 'button', compose: { with: BoxA } })
          adapter.render(BoxB, { ref })
          expect(ref.current).toBeInstanceOf(HTMLElement)
          expect(tagOf(ref.current!)).toBe('button')
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
        expectClassNames(element.className, { has: ['parent-compound-ghost-lg', 'child-base'] })
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
        expectClassNames(element.className, { has: ['intent-ghost', 'size-lg'] })
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
        expectClassNames(element.className, {
          has: ['intent-ghost'],
          lacks: ['size-sm', 'size-lg'],
        })
      })

      it('forwards allProps over compose.defaults when both specify the same prop', () => {
        const BoxA = adapter.createComponent({
          styling: { variants: { intent: { ghost: 'intent-ghost', solid: 'intent-solid' } } },
        })
        const BoxB = adapter.createComponent({
          compose: { with: BoxA, allProps: true, defaults: { intent: 'ghost' } },
        })
        const { element } = adapter.render(BoxB, { intent: 'solid' })
        expectClassNames(element.className, { has: ['intent-solid'], lacks: ['intent-ghost'] })
      })

      it('with allProps: true, explicit asChild/ref/children still win over forwarded props', () => {
        const BoxA = adapter.createComponent({ tag: 'nav' })
        const BoxB = adapter.createComponent({
          tag: 'button',
          compose: { with: BoxA, allProps: true },
        })
        const { element } = adapter.render(BoxB, { 'data-testid': 'inner' })
        expect(tagOf(element)).toBe('button')
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
        withWarnSpy((warnSpy) => {
          adapter.createComponent({
            enforcement: { diagnostics: warnDiagnostics },
            // Empty compose is inert and should not trigger incomplete-config diagnostics.
            compose: {} as unknown as NonNullable<ConformanceFactoryOptions['compose']>,
          })
          expect(warnSpy).not.toHaveBeenCalled()
        })
      })

      it('warns at construction when compose options are supplied without "with"', () => {
        withWarnSpy((warnSpy) => {
          adapter.createComponent({
            enforcement: { diagnostics: warnDiagnostics },
            // Deliberately incomplete: the type requires `with`, the runtime diagnostic covers JS callers.
            compose: { allProps: true } as unknown as NonNullable<
              ConformanceFactoryOptions['compose']
            >,
          })
          const output = warnSpy.mock.calls.flat().join(' ')
          expect(output).toContain('compose.allProps has no effect without compose.with')
        })
      })

      it('diagnoses compose.defaults even when the supplied defaults object is empty', () => {
        withWarnSpy((warnSpy) => {
          adapter.createComponent({
            enforcement: { diagnostics: warnDiagnostics },
            compose: { defaults: {} } as unknown as NonNullable<
              ConformanceFactoryOptions['compose']
            >,
          })
          const output = warnSpy.mock.calls.flat().join(' ')
          expect(output).toContain('compose.defaults has no effect without compose.with')
        })
      })

      it('reports both composition-only options in one diagnostic when with is missing', () => {
        withWarnSpy((warnSpy) => {
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
        })
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
              variants: {
                intent: { ghost: 'partner-intent-ghost' },
                tone: { quiet: 'partner-tone-quiet', loud: 'partner-tone-loud' },
              },
              presets: { emphasis: { tone: 'loud' } },
            },
          })
          const Card = adapter.createComponent({
            compose: { with: Surface, defaults: { tone: 'loud' } },
            styling: {
              base: 'primary-base',
              variants: { size: { lg: 'primary-size-lg' } },
              presets: { emphasis: { size: 'lg' } },
            },
          })

          // `emphasis` exists on both components; only the primary's definition may apply, and
          // `compose.defaults` (partner-scoped) must not become a primary styling default.
          const { element } = adapter.render(
            Card,
            { asChild: true, intent: 'ghost', recipe: 'emphasis' },
            [{ tag: 'button' }],
          )

          expect(tagOf(element)).toBe('button')
          expectClassNames(element.className, {
            has: ['primary-base', 'primary-size-lg'],
            lacks: [
              'partner-base',
              'partner-intent-ghost',
              'partner-tone-quiet',
              'partner-tone-loud',
            ],
          })
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

        expect(tagOf(element)).toBe('section')
        expectClassNames(element.className, { has: ['partner-section', 'primary-section'] })
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
        expectClassNames(element.className, {
          has: ['partner-solid', 'primary-solid'],
          lacks: ['partner-ghost', 'primary-ghost'],
        })
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

        expectClassNames(element.className, {
          has: ['partner-loud', 'primary-base'],
          lacks: ['partner-quiet'],
        })
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
        expectClassNames(element.className, {
          has: ['partner-loud', 'primary-loud', 'partner-lg', 'primary-compact'],
          lacks: ['partner-quiet', 'primary-quiet'],
        })
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
        expectClassNames(element.className, {
          has: ['partner-loud', 'primary-base'],
          lacks: ['partner-quiet'],
        })
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
        expectClassNames(primaryDefault, {
          has: ['partner-quiet', 'primary-quiet'],
          lacks: ['loud'],
        })
        // 2. a recipe beats a primary default
        const recipe = classes(card({ tone: 'quiet' }, 'quiet'), { recipe: 'emphasis' })
        expectClassNames(recipe, { has: ['partner-loud'], lacks: ['partner-quiet'] })
        // 1. an explicit selection beats a recipe
        const explicit = classes(card({ tone: 'loud' }, 'loud'), {
          recipe: 'emphasis',
          tone: 'quiet',
        })
        expectClassNames(explicit, { has: ['partner-quiet', 'primary-quiet'], lacks: ['loud'] })
      })

      it('uses the primary definition for incompatible variants and diagnoses once at construction', () => {
        withWarnSpy((warnSpy) => {
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
          expectClassNames(element.className, { has: ['primary-bold'], lacks: ['partner-'] })
          expect(warnSpy).toHaveBeenCalledTimes(1)
        })
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
        expectClassNames(element.className, { has: ['primary-bold'], lacks: ['partner-'] })
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
        expectClassNames(supported.element.className, {
          has: ['partner-compound-supported-array'],
          lacks: ['partner-compound-unsupported-array'],
        })
        supported.unmount()

        const unsupported = adapter.render(Card, { tone: 'loud', size: 'lg' })
        expectClassNames(unsupported.element.className, {
          lacks: ['partner-compound-supported-array', 'partner-compound-unsupported-array'],
        })
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
          expectClassNames(element.className, {
            has: ['primary-base', 'primary-size-lg', 'caller-class'],
          })
        })

      it('keeps ordinary styling when allProps is supplied without a composition target', () => {
        const Box = adapter.createComponent({
          compose: { allProps: true } as unknown as NonNullable<
            ConformanceFactoryOptions['compose']
          >,
          styling: {
            base: 'primary-base',
            variants: { tone: { quiet: 'primary-quiet', loud: 'primary-loud' } },
            defaults: { tone: 'quiet' },
          },
        })

        const { element } = adapter.render(Box, { tone: 'loud' })

        expectClassNames(element.className, {
          has: ['primary-base', 'primary-loud'],
          lacks: ['primary-quiet'],
        })
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
        expectClassNames(element.className, {
          has: ['primary-size-lg', 'partner-intent-ghost', 'partner-compound-ghost'],
        })
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
        expectClassNames(element.className, {
          has: ['primary-base'],
          lacks: ['partner-intent-ghost'],
        })
      })

      it.each([false, true])(
        'passes primary plugin-owned props into the combined resolver and filters them from the host (allProps=%s)',
        (allProps) => {
          const Surface = adapter.createComponent({
            styling: { base: 'partner-base' },
          })
          const Card = adapter.createComponent({
            compose: { with: Surface, allProps },
            styling: { base: 'primary-base', plugin: compositionOwnedPropPlugin },
          })

          const { element, unmount } = adapter.render(Card, {
            flex: true,
            'data-testid': 'plugin-card',
          })

          expectClassNames(element.className, {
            has: ['partner-base', 'primary-base', 'plugin-flex'],
          })
          expect(element.getAttribute('flex')).toBeNull()
          expect(element.getAttribute('data-testid')).toBe('plugin-card')
          unmount()
        },
      )

      it.each([
        ['contract defaults', { defaults: { flex: true } }],
        ['normalize output', { normalize: (props: AnyRecord) => ({ ...props, flex: true }) }],
      ] as const)(
        'passes primary plugin-owned %s into the combined resolver',
        (_source, primaryOptions) => {
          const Surface = adapter.createComponent({
            styling: { base: 'partner-base' },
          })
          const Card = adapter.createComponent({
            ...primaryOptions,
            compose: { with: Surface },
            styling: { base: 'primary-base', plugin: compositionOwnedPropPlugin },
          })

          const { element, unmount } = adapter.render(Card)

          expect(element.className).toContain('plugin-flex')
          expect(element.getAttribute('flex')).toBeNull()
          unmount()
        },
      )

      it('uses a partner plugin when the primary has none and resolves explicit owned props', () => {
        const Surface = adapter.createComponent({
          styling: { base: 'partner-base', plugin: compositionOwnedPropPlugin },
        })
        const Card = adapter.createComponent({
          compose: { with: Surface },
          styling: { base: 'primary-base' },
        })

        const fromExplicitTrue = adapter.render(Card, { flex: true })
        expect(fromExplicitTrue.element.className).toContain('plugin-flex')
        expect(fromExplicitTrue.element.getAttribute('flex')).toBeNull()
        fromExplicitTrue.unmount()

        const fromExplicitFalse = adapter.render(Card, { flex: false })
        expect(fromExplicitFalse.element.className).not.toContain('plugin-flex')
        expect(fromExplicitFalse.element.getAttribute('flex')).toBeNull()
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
      expectClassNames(element.className, { has: ['bg-blue', 'text-lg'] })
    })
  })

  // ── enforcement ───────────────────────────────────────────────────────────────

  describe('conformance — enforcement', () => {
    it('throws when children count is below min (throwDiagnostics)', () => {
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [{ name: 'Item', match: matchAnyChild, cardinality: { min: 2 } }],
        },
      })
      // 1 child provided; rule requires at least 2
      expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).toThrow()
    })

    it('throws when children count exceeds max (throwDiagnostics)', () => {
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [{ name: 'Item', match: matchAnyChild, cardinality: { max: 2 } }],
        },
      })
      // 3 children provided; rule allows at most 2
      expect(() =>
        adapter.render(Group, {}, [{ tag: 'span' }, { tag: 'span' }, { tag: 'span' }]),
      ).toThrow()
    })

    it('warns but does not throw when warnDiagnostics', () => {
      withWarnSpy((warnSpy) => {
        const Group = adapter.createComponent({
          enforcement: {
            diagnostics: warnDiagnostics,
            children: [
              {
                name: 'Item',
                match: matchAnyChild,
                cardinality: { min: 2, max: 2 },
              },
            ],
          },
        })
        expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).not.toThrow()
        expect(warnSpy).toHaveBeenCalled()
      })
    })

    it('is silent when silentDiagnostics', () => {
      withWarnSpy((warnSpy) => {
        const Group = adapter.createComponent({
          enforcement: {
            diagnostics: silentDiagnostics,
            children: [
              {
                name: 'Item',
                match: matchAnyChild,
                cardinality: { min: 2, max: 2 },
              },
            ],
          },
        })
        expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).not.toThrow()
        expect(warnSpy).not.toHaveBeenCalled()
      })
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
        expect(tagOf(result.element)).toBe('div')
        result.rerender({ as: 'section' })
        expect(tagOf(result.element)).toBe('section')
      })
  })
}
