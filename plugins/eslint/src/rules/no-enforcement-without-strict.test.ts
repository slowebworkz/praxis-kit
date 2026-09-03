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
    `createContractComponent({ tag: 'div' })`,

    // enforcement with diagnostics and children
    `createContractComponent({ tag: 'div', enforcement: { diagnostics: warnDiagnostics, children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,

    // enforcement with diagnostics and aria
    `createContractComponent({ tag: 'nav', enforcement: { diagnostics: throwDiagnostics, aria: [] } })`,

    // enforcement with diagnostics only (no children/aria)
    `createContractComponent({ tag: 'div', enforcement: { diagnostics: warnDiagnostics } })`,

    // empty children array — no meaningful enforcement, strict not required
    `createContractComponent({ tag: 'div', enforcement: { children: [] } })`,

    // not the factory function
    `somethingElse({ tag: 'div', enforcement: { children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,
  ],

  invalid: [
    {
      // children without strict
      code: `createContractComponent({ tag: 'div', enforcement: { children: [{ name: 'X', match: () => true, cardinality: { min: 1 } }] } })`,
      errors: [{ messageId: 'missingStrict' }],
    },
    {
      // aria without strict
      code: `createContractComponent({ tag: 'nav', enforcement: { aria: [{ role: 'navigation' }] } })`,
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
