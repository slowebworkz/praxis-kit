import { afterAll, describe, it } from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { noEnforcementWithoutStrict } from './no-enforcement-without-strict'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('no-enforcement-without-strict', noEnforcementWithoutStrict, {
  valid: [
    // no enforcement at all
    `createPolymorphicComponent({ tag: 'div' })`,

    // enforcement with strict and children
    `createPolymorphicComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,

    // enforcement with strict and aria
    `createPolymorphicComponent({ tag: 'nav', enforcement: { strict: 'throw', aria: [] } })`,

    // enforcement with strict only (no children/aria)
    `createPolymorphicComponent({ tag: 'div', enforcement: { strict: 'warn' } })`,

    // empty children array — no meaningful enforcement, strict not required
    `createPolymorphicComponent({ tag: 'div', enforcement: { children: [] } })`,

    // not the factory function
    `somethingElse({ tag: 'div', enforcement: { children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,
  ],

  invalid: [
    {
      // children without strict
      code: `createPolymorphicComponent({ tag: 'div', enforcement: { children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,
      errors: [{ messageId: 'missingStrict' }],
    },
    {
      // aria without strict
      code: `createPolymorphicComponent({ tag: 'nav', enforcement: { aria: [{ role: 'navigation' }] } })`,
      errors: [{ messageId: 'missingStrict' }],
    },
    {
      // custom callee name via options
      code: `myFactory({ tag: 'div', enforcement: { children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,
      options: [{ calleeNames: ['myFactory'] }],
      errors: [{ messageId: 'missingStrict' }],
    },
  ],
})
