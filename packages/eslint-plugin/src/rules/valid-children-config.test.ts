import { afterAll, describe, it } from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { validChildrenConfig } from './valid-children-config'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('valid-children-config', validChildrenConfig, {
  valid: [
    // single position:'first' rule — fine
    `createPolymorphicComponent({ tag: 'div', enforcement: {
      children: [
        { match: () => true, cardinality: { min: 1 }, position: 'first' },
      ],
    } })`,

    // single position:'last' rule — fine
    `createPolymorphicComponent({ tag: 'div', enforcement: {
      children: [
        { match: () => true, cardinality: { min: 1 }, position: 'last' },
      ],
    } })`,

    // position:'only' with min:1 and no other rules — fine
    `createPolymorphicComponent({ tag: 'div', enforcement: {
      children: [
        { match: () => true, cardinality: { min: 1 }, position: 'only' },
      ],
    } })`,

    // position:'only' with min:1 but other rule has min:0 — fine (optional other rule)
    `createPolymorphicComponent({ tag: 'div', enforcement: {
      children: [
        { match: () => true, cardinality: { min: 1 }, position: 'only' },
        { match: () => true, cardinality: { min: 0, max: 2 } },
      ],
    } })`,

    // position:'only' with min:0 and another rule with min:1 — fine (only rule is optional)
    `createPolymorphicComponent({ tag: 'div', enforcement: {
      children: [
        { match: () => true, cardinality: { min: 0 }, position: 'only' },
        { match: () => true, cardinality: { min: 1 } },
      ],
    } })`,

    // first + last are different positions — fine
    `createPolymorphicComponent({ tag: 'div', enforcement: {
      children: [
        { match: () => true, position: 'first' },
        { match: () => true, position: 'last' },
      ],
    } })`,

    // no enforcement key — nothing to check
    `createPolymorphicComponent({ tag: 'div', styling: { variants: { size: { sm: 'sm' } } } })`,

    // no children key in enforcement — nothing to check
    `createPolymorphicComponent({ tag: 'div', enforcement: { strict: true } })`,

    // non-factory call — ignored
    `somethingElse({ enforcement: { children: [
      { match: () => true, position: 'first' },
      { match: () => true, position: 'first' },
    ] } })`,
  ],

  invalid: [
    {
      // two rules with position:'first'
      code: `createPolymorphicComponent({ tag: 'div', enforcement: {
        children: [
          { match: () => true, position: 'first' },
          { match: () => true, position: 'first' },
        ],
      } })`,
      errors: [{ messageId: 'multipleFirst' }],
    },
    {
      // three rules with position:'first' — reports two (second and third)
      code: `createPolymorphicComponent({ tag: 'div', enforcement: {
        children: [
          { match: () => true, position: 'first' },
          { match: () => true, position: 'first' },
          { match: () => true, position: 'first' },
        ],
      } })`,
      errors: [{ messageId: 'multipleFirst' }, { messageId: 'multipleFirst' }],
    },
    {
      // two rules with position:'last'
      code: `createPolymorphicComponent({ tag: 'div', enforcement: {
        children: [
          { match: () => true, position: 'last' },
          { match: () => true, position: 'last' },
        ],
      } })`,
      errors: [{ messageId: 'multipleLast' }],
    },
    {
      // position:'only' with min:1 and another rule also with min:1
      code: `createPolymorphicComponent({ tag: 'div', enforcement: {
        children: [
          { match: () => true, cardinality: { min: 1 }, position: 'only' },
          { match: () => true, cardinality: { min: 1 } },
        ],
      } })`,
      errors: [{ messageId: 'minSumExceedsCapacity', data: { count: '1' } }],
    },
    {
      // position:'only' with min:1 and two other rules each with min:1
      code: `createPolymorphicComponent({ tag: 'div', enforcement: {
        children: [
          { match: () => true, cardinality: { min: 1 }, position: 'only' },
          { match: () => true, cardinality: { min: 1 } },
          { match: () => true, cardinality: { min: 1 } },
        ],
      } })`,
      errors: [{ messageId: 'minSumExceedsCapacity', data: { count: '2' } }],
    },
    {
      // both position conflicts and capacity conflict simultaneously
      code: `createPolymorphicComponent({ tag: 'div', enforcement: {
        children: [
          { match: () => true, cardinality: { min: 1 }, position: 'only' },
          { match: () => true, cardinality: { min: 1 }, position: 'first' },
          { match: () => true, cardinality: { min: 1 }, position: 'first' },
        ],
      } })`,
      errors: [
        { messageId: 'minSumExceedsCapacity', data: { count: '2' } },
        { messageId: 'multipleFirst' },
      ],
    },
    {
      // custom callee name via options
      code: `createContractComponent({ tag: 'div', enforcement: {
        children: [
          { match: () => true, position: 'last' },
          { match: () => true, position: 'last' },
        ],
      } })`,
      options: [{ calleeNames: ['createContractComponent'] }],
      errors: [{ messageId: 'multipleLast' }],
    },
  ],
})
