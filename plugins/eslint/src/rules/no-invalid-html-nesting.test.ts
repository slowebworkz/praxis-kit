import { afterAll, describe, it } from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import tseslint from 'typescript-eslint'
import { noInvalidHtmlNesting } from './no-invalid-html-nesting'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

tester.run('no-invalid-html-nesting', noInvalidHtmlNesting, {
  valid: [
    // ul/ol — li children
    `const el = <ul><li>item</li></ul>`,
    `const el = <ol><li>item</li></ol>`,
    `const el = <ul><li>a</li><li>b</li></ul>`,

    // ul/ol — metadata children
    `const el = <ul><script src="x.js" /></ul>`,
    `const el = <ul><template /></ul>`,

    // table — valid section children
    `const el = <table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>`,
    `const el = <table><caption>Cap</caption><tbody><tr><td>D</td></tr></tbody></table>`,
    `const el = <table><colgroup><col /></colgroup><tbody><tr><td /></tr></tbody></table>`,

    // thead/tbody/tfoot — tr children
    `const el = <thead><tr><th /></tr></thead>`,
    `const el = <tbody><tr><td /></tr></tbody>`,
    `const el = <tfoot><tr><td /></tr></tfoot>`,

    // tr — td/th children
    `const el = <tr><td>cell</td><th>header</th></tr>`,

    // dl — dt/dd/div children
    `const el = <dl><dt>term</dt><dd>def</dd></dl>`,
    `const el = <dl><div><dt>term</dt><dd>def</dd></div></dl>`,

    // select — option/optgroup children
    `const el = <select><option>A</option><option>B</option></select>`,
    `const el = <select><optgroup label="G"><option>A</option></optgroup></select>`,
    `const el = <select><hr /></select>`,

    // optgroup — option children
    `const el = <optgroup label="G"><option>A</option></optgroup>`,

    // colgroup — col children
    `const el = <colgroup><col span={2} /></colgroup>`,

    // picture — source + img
    `const el = <picture><source srcSet="a.webp" /><img src="a.jpg" alt="" /></picture>`,
    `const el = <picture><img src="a.jpg" alt="" /></picture>`,

    // No allowlist for this parent — passes through
    `const el = <div><span>ok</span><p>ok</p></div>`,
    `const el = <section><article>ok</article></section>`,

    // Component children (uppercase) — always skipped, even inside restricted parents
    `const el = <ul><ListItem /></ul>`,
    `const el = <tr><DataCell /></tr>`,

    // Dynamic children — skip expression containers
    `const el = <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>`,
    `const el = <table>{rows}</table>`,

    // Text nodes (whitespace) — skip JSXText
    `const el = <ul>  <li>item</li>  </ul>`,
  ],

  invalid: [
    // ul/ol — block elements
    {
      code: `const el = <ul><div>bad</div></ul>`,
      errors: [
        {
          messageId: 'invalidChild',
          data: { child: 'div', parent: 'ul', allowed: 'li, script, template' },
        },
      ],
    },
    {
      code: `const el = <ol><p>bad</p></ol>`,
      errors: [
        {
          messageId: 'invalidChild',
          data: { child: 'p', parent: 'ol', allowed: 'li, script, template' },
        },
      ],
    },
    {
      code: `const el = <ul><li>ok</li><span>bad</span></ul>`,
      errors: [
        {
          messageId: 'invalidChild',
          data: { child: 'span', parent: 'ul', allowed: 'li, script, template' },
        },
      ],
    },

    // table — non-section children
    {
      code: `const el = <table><div>bad</div></table>`,
      errors: [{ messageId: 'invalidChild' }],
    },
    {
      code: `const el = <table><p>bad</p></table>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // thead/tbody/tfoot — non-tr children
    {
      code: `const el = <tbody><td>bad</td></tbody>`,
      errors: [
        {
          messageId: 'invalidChild',
          data: { child: 'td', parent: 'tbody', allowed: 'tr, script, template' },
        },
      ],
    },
    {
      code: `const el = <thead><div>bad</div></thead>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // tr — non-td/th children
    {
      code: `const el = <tr><div>bad</div></tr>`,
      errors: [
        {
          messageId: 'invalidChild',
          data: { child: 'div', parent: 'tr', allowed: 'td, th, script, template' },
        },
      ],
    },
    {
      code: `const el = <tr><tr>nested</tr></tr>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // dl — non-dt/dd/div children
    {
      code: `const el = <dl><li>bad</li></dl>`,
      errors: [{ messageId: 'invalidChild' }],
    },
    {
      code: `const el = <dl><p>bad</p></dl>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // select — non-option children
    {
      code: `const el = <select><div>bad</div></select>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // optgroup — non-option children
    {
      code: `const el = <optgroup label="G"><div>bad</div></optgroup>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // colgroup — non-col children
    {
      code: `const el = <colgroup><td>bad</td></colgroup>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // picture — non-source/img children
    {
      code: `const el = <picture><div>bad</div><img src="x.jpg" alt="" /></picture>`,
      errors: [{ messageId: 'invalidChild' }],
    },

    // multiple violations in one parent
    {
      code: `const el = <ul><div>a</div><span>b</span></ul>`,
      errors: [
        {
          messageId: 'invalidChild',
          data: { child: 'div', parent: 'ul', allowed: 'li, script, template' },
        },
        {
          messageId: 'invalidChild',
          data: { child: 'span', parent: 'ul', allowed: 'li, script, template' },
        },
      ],
    },
  ],
})
