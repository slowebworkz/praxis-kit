import { describe, expect, it } from 'vitest'
import { compileComponent } from './compile-component'
import { namePass, tagPass, nodes } from './compile-component.helpers'

describe('compileComponent', () => {
  it('returns null when identity is incomplete', async () => {
    expect(await compileComponent(nodes(namePass, tagPass))).toBeNull()
  })

  it('returns null when no passes run', async () => {
    expect(await compileComponent(new Map())).toBeNull()
  })
})
