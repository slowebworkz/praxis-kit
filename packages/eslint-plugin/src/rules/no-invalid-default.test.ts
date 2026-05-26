import { afterAll, describe, it } from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { noInvalidDefault } from './no-invalid-default'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('no-invalid-default', noInvalidDefault, {
  valid: [
    // all default keys and values exist in variants
    `createPolymorphicComponent({ tag: 'button', styling: {
      variants: { size: { sm: 'btn-sm', lg: 'btn-lg' }, intent: { primary: 'p', ghost: 'g' } },
      defaults: { size: 'sm', intent: 'primary' },
    } })`,

    // single default
    `createPolymorphicComponent({ tag: 'div', styling: {
      variants: { size: { sm: 'sm', lg: 'lg' } },
      defaults: { size: 'lg' },
    } })`,

    // no defaults key — nothing to check
    `createPolymorphicComponent({ tag: 'div', styling: {
      variants: { size: { sm: 'sm' } },
    } })`,

    // no variants key — can't analyze, skip silently
    `createPolymorphicComponent({ tag: 'div', styling: {
      defaults: { size: 'sm' },
    } })`,

    // default value is a dynamic expression — can't analyze, skip
    `createPolymorphicComponent({ tag: 'div', styling: {
      variants: { size: { sm: 'sm', lg: 'lg' } },
      defaults: { size: someVar },
    } })`,

    // reportNonLiteral off (default) — dynamic value still silent
    {
      code: `createPolymorphicComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        defaults: { size: someVar },
      } })`,
      options: [{ reportNonLiteral: false }],
    },

    // no styling key at all
    `createPolymorphicComponent({ tag: 'div' })`,

    // non-factory call — ignored
    `somethingElse({ styling: { variants: { size: { sm: 'sm' } }, defaults: { color: 'red' } } })`,
  ],

  invalid: [
    {
      // unknown default key
      code: `createPolymorphicComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        defaults: { color: 'red' },
      } })`,
      errors: [{ messageId: 'unknownDefaultKey', data: { key: 'color' } }],
    },
    {
      // unknown default value for a known key
      code: `createPolymorphicComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        defaults: { size: 'xl' },
      } })`,
      errors: [
        {
          messageId: 'unknownDefaultValue',
          data: { key: 'size', value: 'xl', allowed: '"sm", "lg"' },
        },
      ],
    },
    {
      // multiple bad defaults
      code: `createPolymorphicComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' }, intent: { primary: 'p', ghost: 'g' } },
        defaults: { size: 'xl', intent: 'danger' },
      } })`,
      errors: [
        {
          messageId: 'unknownDefaultValue',
          data: { key: 'size', value: 'xl', allowed: '"sm", "lg"' },
        },
        {
          messageId: 'unknownDefaultValue',
          data: { key: 'intent', value: 'danger', allowed: '"primary", "ghost"' },
        },
      ],
    },
    {
      // mix of bad key and bad value
      code: `createPolymorphicComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        defaults: { color: 'red', size: 'xxl' },
      } })`,
      errors: [
        { messageId: 'unknownDefaultKey', data: { key: 'color' } },
        {
          messageId: 'unknownDefaultValue',
          data: { key: 'size', value: 'xxl', allowed: '"sm", "lg"' },
        },
      ],
    },
    {
      // custom callee name via options
      code: `createContractComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm' } },
        defaults: { color: 'red' },
      } })`,
      options: [{ calleeNames: ['createContractComponent'] }],
      errors: [{ messageId: 'unknownDefaultKey', data: { key: 'color' } }],
    },
    {
      // reportNonLiteral: true — dynamic default value is reported
      code: `createPolymorphicComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm', lg: 'lg' } },
        defaults: { size: someVar },
      } })`,
      options: [{ reportNonLiteral: true }],
      errors: [{ messageId: 'nonLiteralValue', data: { key: 'size' } }],
    },
    {
      // reportNonLiteral: true — multiple dynamic defaults each reported
      code: `createPolymorphicComponent({ tag: 'div', styling: {
        variants: { size: { sm: 'sm' }, intent: { primary: 'p' } },
        defaults: { size: someVar, intent: otherVar },
      } })`,
      options: [{ reportNonLiteral: true }],
      errors: [
        { messageId: 'nonLiteralValue', data: { key: 'size' } },
        { messageId: 'nonLiteralValue', data: { key: 'intent' } },
      ],
    },
  ],
})
