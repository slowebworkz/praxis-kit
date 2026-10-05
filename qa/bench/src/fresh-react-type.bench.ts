// Control: does React itself pay a first-render cost for a new component type?
// Plain function components only, no Praxis. Fresh = a new function identity per iteration.
import { bench, describe } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

function ReusedBox(props: { children?: unknown }) {
  return createElement('div', { className: 'box' }, props.children as never)
}

describe('fresh react type control', () => {
  bench('reused plain function component', () => {
    renderToString(createElement(ReusedBox, null, 'Save'))
  })
  bench('fresh plain function component + 1st render', () => {
    const Fresh = function FreshBox(props: { children?: unknown }) {
      return createElement('div', { className: 'box' }, props.children as never)
    }
    renderToString(createElement(Fresh, null, 'Save'))
  })
  bench('fresh plain function component + 1st + 2nd render', () => {
    const Fresh = function FreshBox(props: { children?: unknown }) {
      return createElement('div', { className: 'box' }, props.children as never)
    }
    renderToString(createElement(Fresh, null, 'Save'))
    renderToString(createElement(Fresh, null, 'Save'))
  })
})
