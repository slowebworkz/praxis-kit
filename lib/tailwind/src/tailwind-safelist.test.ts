import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { layoutKeys } from './layout-keys'

const cssPath = fileURLToPath(new URL('./tailwind-safelist.css', import.meta.url))

function extractSafelistedClasses(css: string): string[] {
  const match = css.match(/@source inline\("([^"]*)"\)/)
  if (!match?.[1]) throw new Error('tailwind-safelist.css: no @source inline(...) directive found')
  return match[1].split(/\s+/).filter(Boolean)
}

describe('tailwind-safelist.css', () => {
  it('safelists exactly the values in layoutKeys, in order', () => {
    const css = readFileSync(cssPath, 'utf-8')
    expect(extractSafelistedClasses(css)).toEqual([...layoutKeys])
  })
})
