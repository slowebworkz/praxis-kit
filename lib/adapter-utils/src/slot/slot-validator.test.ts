import { describe, expect, it } from 'vitest'
import {
  CollectingReporter,
  DefaultPolicy,
  Diagnostics,
  DiagnosticCode,
  Severity,
} from '@praxis-kit/diagnostics'
import { SlotValidator } from './slot-validator'

function makeWarnCollecting() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
  return { reporter, diagnostics }
}

describe('SlotValidator.warnAllowedAsMismatch', () => {
  it('reports a warn-severity SlotAllowedAsMismatch diagnostic naming the component, child tag, and allowed list', () => {
    const { reporter, diagnostics } = makeWarnCollecting()
    const validator = new SlotValidator('HoverCard.Trigger', diagnostics, 'React element')

    validator.warnAllowedAsMismatch('a', ['button'])

    expect(reporter.diagnostics).toHaveLength(1)
    const diagnostic = reporter.diagnostics[0]!
    expect(diagnostic.code).toBe(DiagnosticCode.SlotAllowedAsMismatch)
    expect(diagnostic.severity).toBe(Severity.Warning)
    expect(diagnostic.component).toBe('HoverCard.Trigger')
    expect(diagnostic.message).toContain('"a"')
    expect(diagnostic.message).toContain('"button"')
  })

  it('lists every allowed tag when more than one is configured', () => {
    const { reporter, diagnostics } = makeWarnCollecting()
    const validator = new SlotValidator('Trigger', diagnostics, 'React element')

    validator.warnAllowedAsMismatch('div', ['button', 'a'])

    expect(reporter.diagnostics[0]!.message).toContain('"button", "a"')
  })

  it('never throws — this diagnostic is always warn-severity, unlike assertExclusive/assertSingleChild', () => {
    const { diagnostics } = makeWarnCollecting()
    const validator = new SlotValidator('Trigger', diagnostics, 'React element')

    expect(() => validator.warnAllowedAsMismatch('a', ['button'])).not.toThrow()
  })
})
