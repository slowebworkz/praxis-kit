import { afterAll, describe, it } from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { noDeadCompound } from './no-dead-compound'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('no-dead-compound', noDeadCompound, {
  valid: [
    // all compound keys and values exist in variants
    `createContractComponent({ tag: 'button', styling: {
      variants: { size: { sm: 'btn-sm', lg: 'btn-lg' }, intent: { primary: 'btn-primary', ghost: 'btn-ghost' } },
      compounds: [{ size: 'lg', intent: 'ghost', class: 'btn-lg-ghost' }],
    } })`,

    // single-variant compound
    `createContractComponent({ tag: 'div', styling: {
      variants: { size: { sm: 'sm', lg: 'lg' } },
      compounds: [{ size: 'sm', class: 'small' }],
    } })`,

    // class key is always ignored
    `createContractComponent({ tag: 'div', styling: {
      variants: { size: { sm: 'sm' } },
      compounds: [{ size: 'sm', class: 'anything' }],
    } })`,

    // no compounds key — nothing to check
    `createContractComponent({ tag: 'div', styling: {
      variants: { size: { sm: 'sm' } },
    } })`,

    // no variants key — can't analyze, skip silently
    `createContractComponent({ tag: 'div', styling: {
      compounds: [{ size: 'lg', class: 'big' }],
    } })`,

    // compound value is a dynamic expression — can't analyze, skip
    `createContractComponent({ tag: 'div', styling: {
      variants: { size: { sm: 'sm', lg: 'lg' } },
      compounds: [{ size: someVar, class: 'x' }],
    } })`,

    // reportNonLiteral off (default) — dynamic value still silent
    {
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        compounds: [{ size: someVar, class: 'x' }],
      } })`,
      options: [{ reportNonLiteral: false }],
    },

    // no styling key at all
    `createContractComponent({ tag: 'div' })`,

    // non-factory call — ignored
    `somethingElse({ styling: { variants: { size: { sm: 'sm' } }, compounds: [{ color: 'red', class: 'x' }] } })`,
  ],

  invalid: [
    {
      // unknown variant key in compound
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        compounds: [{ color: 'red', class: 'x' }],
      } })`,
      errors: [{ messageId: 'unknownVariantKey', data: { key: 'color' } }],
    },
    {
      // unknown variant value for a known key
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        compounds: [{ size: 'xl', class: 'x' }],
      } })`,
      errors: [
        {
          messageId: 'unknownVariantValue',
          data: { key: 'size', value: 'xl', allowed: '"sm", "lg"' },
        },
      ],
    },
    {
      // multiple bad conditions in one compound
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' }, intent: { primary: 'p', ghost: 'g' } },
        compounds: [{ size: 'xl', intent: 'danger', class: 'x' }],
      } })`,
      errors: [
        {
          messageId: 'unknownVariantValue',
          data: { key: 'size', value: 'xl', allowed: '"sm", "lg"' },
        },
        {
          messageId: 'unknownVariantValue',
          data: { key: 'intent', value: 'danger', allowed: '"primary", "ghost"' },
        },
      ],
    },
    {
      // bad compound in one entry, good in another — only reports the bad one
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        compounds: [
          { size: 'sm', class: 'small' },
          { size: 'xxl', class: 'huge' },
        ],
      } })`,
      errors: [
        {
          messageId: 'unknownVariantValue',
          data: { key: 'size', value: 'xxl', allowed: '"sm", "lg"' },
        },
      ],
    },
    {
      // custom callee name via options
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm' } },
        compounds: [{ color: 'red', class: 'x' }],
      } })`,
      options: [{ calleeNames: ['createContractComponent'] }],
      errors: [{ messageId: 'unknownVariantKey', data: { key: 'color' } }],
    },
    {
      // reportNonLiteral: true — dynamic value is reported
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        compounds: [{ size: someVar, class: 'x' }],
      } })`,
      options: [{ reportNonLiteral: true }],
      errors: [{ messageId: 'nonLiteralValue', data: { key: 'size' } }],
    },
    {
      // reportNonLiteral: true — multiple dynamic values each reported
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm' }, intent: { primary: 'p' } },
        compounds: [{ size: someVar, intent: otherVar, class: 'x' }],
      } })`,
      options: [{ reportNonLiteral: true }],
      errors: [
        { messageId: 'nonLiteralValue', data: { key: 'size' } },
        { messageId: 'nonLiteralValue', data: { key: 'intent' } },
      ],
    },
  ],
})
