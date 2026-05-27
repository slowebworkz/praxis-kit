import { afterAll, describe, it } from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { validCardinality } from './valid-cardinality'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

tester.run('valid-cardinality', validCardinality, {
  valid: [
    // min only
    `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,

    // max only (>0)
    `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { max: 3 } }] } })`,

    // min and max, valid
    `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { min: 1, max: 3 } }] } })`,

    // min === max === 1
    `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { min: 1, max: 1 } }] } })`,

    // min === 0 is valid (0 or more)
    `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { min: 0, max: 5 } }] } })`,

    // no cardinality at all
    `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true }] } })`,
  ],

  invalid: [
    {
      // max < min
      code: `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { min: 3, max: 1 } }] } })`,
      errors: [{ messageId: 'maxLessThanMin' }],
    },
    {
      // negative min
      code: `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { min: -1 } }] } })`,
      errors: [{ messageId: 'negativeMin' }],
    },
    {
      // negative max
      code: `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { max: -2 } }] } })`,
      errors: [{ messageId: 'negativeMax' }],
    },
    {
      // max: 0 is suspicious
      code: `createContractComponent({ tag: 'div', enforcement: { strict: 'warn', children: [{ name: 'X', match: () => true, cardinality: { max: 0 } }] } })`,
      errors: [{ messageId: 'zeroMax' }],
    },
  ],
})
