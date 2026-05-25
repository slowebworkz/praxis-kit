import { afterAll, describe, it } from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import tseslint from 'typescript-eslint'
import { noRedundantRole } from './no-redundant-role'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

tester.run('no-redundant-role', noRedundantRole, {
  valid: [
    // no role attribute
    `const el = <nav />`,

    // different role (an override — may or may not be valid, but not redundant)
    `const el = <nav role="menu" />`,

    // element with no implicit role
    `const el = <div role="navigation" />`,

    // unknown element
    `const el = <MyComponent role="navigation" />`,

    // dynamic role expression — can't statically evaluate
    `const el = <nav role={role} />`,
  ],

  invalid: [
    {
      code: `const el = <nav role="navigation" />`,
      errors: [{ messageId: 'redundantRole' }],
      output: `const el = <nav  />`,
    },
    {
      code: `const el = <button role="button" />`,
      errors: [{ messageId: 'redundantRole' }],
      output: `const el = <button  />`,
    },
    {
      code: `const el = <main role="main" />`,
      errors: [{ messageId: 'redundantRole' }],
      output: `const el = <main  />`,
    },
    {
      code: `const el = <ul role="list" />`,
      errors: [{ messageId: 'redundantRole' }],
      output: `const el = <ul  />`,
    },
    {
      // JSX expression container literal also flagged and fixed
      code: `const el = <nav role={"navigation"} />`,
      errors: [{ messageId: 'redundantRole' }],
      output: `const el = <nav  />`,
    },
  ],
})
