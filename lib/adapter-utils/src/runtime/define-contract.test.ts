import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineContract } from './define-contract'
import { declareProps } from './declare-props'
import type {
  AnyRecord,
  ContractAllowedOf,
  ContractPresetOf,
  ContractPropsOf,
  ContractTagOf,
  ContractVariantsOf,
  ElementType,
  EmptyRecord,
} from '@praxis-kit/core'

describe('defineContract — runtime (identity, no normalization)', () => {
  it('returns the exact same object reference it was given', () => {
    const options = { tag: 'div', name: 'Box' }
    expect(defineContract(options)).toBe(options)
  })

  it('does not add, remove, or default any field', () => {
    const options = { tag: 'button', name: 'Button' } as const
    expect(defineContract(options)).toEqual({ tag: 'button', name: 'Button' })
  })
})

describe('defineContract — type-level: requires tag/name, each a non-empty string', () => {
  it('rejects a config missing tag', () => {
    // @ts-expect-error — ContractInput requires `tag`
    defineContract({ name: 'Box' })
  })

  it('rejects a config missing name', () => {
    // @ts-expect-error — ContractInput requires `name`
    defineContract({ tag: 'div' })
  })

  it('rejects an empty-string tag', () => {
    // @ts-expect-error — tag must be a non-empty string
    defineContract({ tag: '', name: 'Box' })
  })

  it('rejects an empty-string name', () => {
    // @ts-expect-error — name must be a non-empty string
    defineContract({ tag: 'div', name: '' })
  })
})

describe('defineContract — establishes the ContractModel exactly, from real evidence', () => {
  it('a minimal contract recovers tag exactly and tight empty defaults for everything else', () => {
    const boxContract = defineContract({ tag: 'div', name: 'Box' })
    void boxContract
    expectTypeOf<ContractTagOf<typeof boxContract>>().toEqualTypeOf<'div'>()
    expectTypeOf<ContractVariantsOf<typeof boxContract>>().toEqualTypeOf<Readonly<EmptyRecord>>()
    expectTypeOf<ContractPresetOf<typeof boxContract>>().toEqualTypeOf<Readonly<EmptyRecord>>()
    expectTypeOf<ContractAllowedOf<typeof boxContract>>().toEqualTypeOf<ElementType>()
  })

  it('a full contract recovers every dimension exactly', () => {
    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      defaults: { href: '#' },
      styling: {
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        presets: { cta: { size: 'lg' } },
      },
      enforcement: { allowedAs: ['a', 'button'] },
    })
    void buttonContract
    expectTypeOf<ContractTagOf<typeof buttonContract>>().toEqualTypeOf<'button'>()
    expectTypeOf<ContractVariantsOf<typeof buttonContract>>().toEqualTypeOf<{
      readonly size: { readonly sm: 'text-sm'; readonly lg: 'text-lg' }
    }>()
    expectTypeOf<ContractPresetOf<typeof buttonContract>>().toEqualTypeOf<{
      readonly cta: { readonly size: 'lg' }
    }>()
    expectTypeOf<ContractAllowedOf<typeof buttonContract>>().toEqualTypeOf<'a' | 'button'>()
    // Props: recovered from `defaults`'s own shape — see ContractPropsFrom's doc comment for
    // why this is only ever as complete as `defaults` itself (not a general recovery of some
    // independently-declared, wider Props type), why matching against O's own literal type
    // (rather than FactoryOptions's declared, NoInfer-wrapped field type) sidesteps the NoInfer
    // limitation an earlier draft of this file hit, why the recovered value type is widened back
    // to `string` (not the literal `'#'` the `const` argument actually infers — a `defaults`
    // value is a default, not the only value a caller may ever pass), and why the key itself is
    // optional (a prop with a default is, by definition, optional to the caller).
    expectTypeOf<ContractPropsOf<typeof buttonContract>>().toEqualTypeOf<{
      readonly href?: string
    }>()
  })
})

/**
 * `ContractPropsOf<C>` — the `defaults`-only gap documented above (`defaults` reveals only
 * "props with a default," not a component's complete prop set) is real, but not the end state:
 * `FactoryOptions.props` + `declareProps<Props>()` close it. An author who needs precise recovery
 * declares the full type once, inline in the same object literal `defineContract`'s `const O`
 * already infers from — no curried API, no explicit generic argument at the
 * `defineContract`/`createContractComponent` call site itself. See `ContractPropsFrom`'s
 * (`lib/primitive`) own doc comment for the two-path precedence this relies on.
 */
describe('defineContract — Props recovery beyond `defaults` (declareProps)', () => {
  it('defaults-only recovery sees only what defaults reveals — real props with no default vanish', () => {
    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      defaults: { type: 'button' },
    })
    void buttonContract
    // `onClick`/`disabled` are real props a `<button>` accepts, but nothing here names them —
    // defaults-only recovery has no way to know about them. This is the gap declareProps closes.
    expectTypeOf<ContractPropsOf<typeof buttonContract>>().toEqualTypeOf<{
      readonly type?: string
    }>()
  })

  it('an explicit `props` declaration recovers the complete type exactly, not just what defaults reveals', () => {
    interface ButtonProps {
      readonly type?: 'button' | 'submit' | 'reset'
      readonly onClick?: () => void
      readonly disabled?: boolean
    }

    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      props: declareProps<ButtonProps>(),
      defaults: { type: 'button' },
    })
    void buttonContract
    // `& AnyRecord`: a no-op on ButtonProps's own declared fields, present purely so the recovered
    // type structurally satisfies `Props extends AnyRecord` downstream — see ContractPropsFrom's
    // own doc comment (lib/primitive) for why a hand-declared interface needs this.
    expectTypeOf<ContractPropsOf<typeof buttonContract>>().toEqualTypeOf<ButtonProps & AnyRecord>()
  })

  it('an explicit `props` declaration is used as-is — not Partial-wrapped, not widened', () => {
    interface StrictProps {
      readonly requiredLabel: string
    }

    const labeledContract = defineContract({
      tag: 'div',
      name: 'Labeled',
      props: declareProps<StrictProps>(),
    })
    void labeledContract
    // `requiredLabel` stays required, proving this recovery path is NOT routed through the
    // defaults-based Partial<WidenShallow<...>> pipeline (which would make it optional).
    expectTypeOf<ContractPropsOf<typeof labeledContract>>().toEqualTypeOf<StrictProps & AnyRecord>()
  })
})
