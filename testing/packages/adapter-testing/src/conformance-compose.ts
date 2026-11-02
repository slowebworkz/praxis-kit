import { describe, expect, it } from 'vitest'
import { throwDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'
import type { ConformanceAdapter, ConformanceComponent, ConformanceFactoryOptions } from './types'
import { expectClassNames, tagOf, withWarnSpy } from './helpers'
import type { ConformanceCaps } from './helpers'

/** The `compose` section of the conformance suite, split out of `conformance.ts` for size. */
export function composeConformance<C extends ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
  caps: ConformanceCaps,
): void {
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
}
