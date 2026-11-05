import { describe, expect, it } from 'vitest'
import { Severity } from '@praxis-kit/diagnostics'
import en from './en'
import golden from './fixtures/english.golden.json'
import { SAMPLES } from './fixtures/samples'
import { createMessageResolver } from './resolver'

// `english.golden.json` is the English every factory produced before its prose moved into the
// catalog. Rendering each sample through the catalog must reproduce it exactly.
const resolve = createMessageResolver(en)
const goldenByKey = golden as Record<string, unknown>

describe('English catalog reproduces the original messages', () => {
  it.each(Object.keys(SAMPLES))('%s', (key) => {
    const fact = SAMPLES[key]!()
    const text = resolve({
      code: fact.code,
      messageId: fact.messageId,
      context: fact.context,
    })
    // Explicit text (the external-rule bridge) never goes through the catalog.
    expect({
      message: text?.message,
      ...(text?.rationale && { rationale: text.rationale }),
      ...(text?.suggestions && { suggestions: text.suggestions }),
    }).toEqual(goldenByKey[key])
  })
})

describe('catalog and samples agree', () => {
  const used = new Set(
    Object.values(SAMPLES).map((make) => {
      const fact = make()
      return fact.messageId ?? fact.code
    }),
  )

  it('has an entry for every id a sample uses', () => {
    expect([...used].filter((id) => !(id in en.messages))).toEqual([])
  })

  it('has no entry that no sample exercises', () => {
    expect(Object.keys(en.messages).filter((id) => !used.has(id))).toEqual([])
  })

  it('golden covers every sample and nothing else', () => {
    expect(Object.keys(goldenByKey).sort()).toEqual(Object.keys(SAMPLES).sort())
  })

  it('every sample is a fact: no prose of its own', () => {
    for (const [key, make] of Object.entries(SAMPLES)) {
      const fact = make()
      expect({
        key,
        message: fact.message,
        rationale: fact.rationale,
        suggestions: fact.suggestions,
      }).toEqual({
        key,
        message: undefined,
        rationale: undefined,
        suggestions: undefined,
      })
    }
    void Severity
  })
})
