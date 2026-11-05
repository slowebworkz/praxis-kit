import { describe, expect, it } from 'vitest'
import { AriaPolicyEngine } from '@praxis-kit/contract'
import type { AriaResult, AriaRule } from '@praxis-kit/contract'
import {
  CollectingReporter,
  DiagnosticCategory,
  DiagnosticCode,
  Diagnostics,
  DefaultPolicy,
  Severity,
} from '@praxis-kit/diagnostics'
import en from './en'
import { createMessageResolver } from './resolver'
import type { MessageCatalog } from './types'

// A custom `enforcement.aria` rule can take part in localization by returning a diagnostic that
// names a catalog entry (`messageId`) and the values it interpolates (`context`). The catalog the
// app passes is the built-in one plus its own entries.
const noDivDialog: AriaRule = Object.assign(
  ({ tag }: { tag: string }): readonly AriaResult[] => [
    {
      valid: false,
      fixable: false,
      severity: 'warning',
      diagnostic: {
        code: DiagnosticCode.AriaViolation,
        category: DiagnosticCategory.ARIA,
        messageId: 'acme.no-div-dialog',
        context: { tag },
      },
    },
  ],
  { id: 'acme.no-div-dialog' },
) as AriaRule

const app = (locale: string, message: string): MessageCatalog => ({
  contract: 1,
  locale,
  messages: { ...en.messages, 'acme.no-div-dialog': { message } },
})

function run(diagnostics: Diagnostics) {
  new AriaPolicyEngine(diagnostics, { rules: [noDivDialog] }).validate('div', {})
}

describe('custom ARIA rules and localization', () => {
  it('resolves a rule-supplied messageId and context from an app-extended catalog', () => {
    const reporter = new CollectingReporter()
    run(
      new Diagnostics(reporter, new DefaultPolicy({ reportThreshold: Severity.Warning }), {
        resolveMessage: createMessageResolver(app('en', '<{tag}> must not be a dialog.')),
      }),
    )
    expect(reporter.diagnostics.map((d) => d.message)).toContain('<div> must not be a dialog.')
  })

  it('reports the code alone when no resolver is configured', () => {
    const reporter = new CollectingReporter()
    run(new Diagnostics(reporter, new DefaultPolicy({ reportThreshold: Severity.Warning })))
    const reported = reporter.diagnostics.find((d) => d.messageId === 'acme.no-div-dialog')
    expect(reported?.message).toBeUndefined()
    expect(reported?.code).toBe(DiagnosticCode.AriaViolation)
  })

  it('lets a rule that supplies explicit text bypass the catalog', () => {
    const explicit: AriaRule = Object.assign(
      (): readonly AriaResult[] => [
        { valid: false, fixable: false, severity: 'warning', message: 'Use <dialog> instead.' },
      ],
      { id: 'acme.explicit' },
    ) as AriaRule
    const reporter = new CollectingReporter()
    const diagnostics = new Diagnostics(
      reporter,
      new DefaultPolicy({ reportThreshold: Severity.Warning }),
      {
        resolveMessage: createMessageResolver(en),
      },
    )
    new AriaPolicyEngine(diagnostics, { rules: [explicit] }).validate('div', {})
    // Text the rule author wrote is carried through the generic ARIA2002 bridge as-is; the catalog,
    // which has no entry for it, is never consulted.
    expect(reporter.diagnostics[0]).toMatchObject({
      code: DiagnosticCode.AriaViolation,
      message: 'Use <dialog> instead.',
    })
  })
})
