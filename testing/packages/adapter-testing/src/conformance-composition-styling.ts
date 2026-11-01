import { describe, expect, it } from 'vitest'
import { createClassPipeline } from '@praxis-kit/core'
import type { AnyRecord, ClassPluginFactory } from '@praxis-kit/core'
import { silentDiagnostics, warnDiagnostics } from '@praxis-kit/diagnostics'
import type { ConformanceAdapter, ConformanceComponent, ConformanceFactoryOptions } from './types'
import { expectClassNames, tagOf, withWarnSpy } from './helpers'
import type { ConformanceCaps } from './helpers'

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

/** The `composition styling` section of the conformance suite, split out for size. */
export function compositionStylingConformance<C extends ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
  caps: ConformanceCaps,
): void {
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
}
