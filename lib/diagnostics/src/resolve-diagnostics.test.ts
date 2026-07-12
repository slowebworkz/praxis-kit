import { describe, expect, it } from 'vitest'

import { Diagnostics } from './diagnostics'
import { silentDiagnostics, throwDiagnostics, warnDiagnostics } from './presets'
import { resolveDiagnostics } from './resolve-diagnostics'
import { nullReporter } from './null-reporter'
import { DefaultPolicy } from './policy'

describe('resolveDiagnostics', () => {
  it('returns the fallback when value is undefined', () => {
    expect(resolveDiagnostics(undefined, warnDiagnostics)).toBe(warnDiagnostics)
  })

  it('resolves "warn" to warnDiagnostics', () => {
    expect(resolveDiagnostics('warn', throwDiagnostics)).toBe(warnDiagnostics)
  })

  it('resolves "throw" to throwDiagnostics', () => {
    expect(resolveDiagnostics('throw', silentDiagnostics)).toBe(throwDiagnostics)
  })

  it('resolves "silent" to silentDiagnostics', () => {
    expect(resolveDiagnostics('silent', throwDiagnostics)).toBe(silentDiagnostics)
  })

  it('passes through a Diagnostics instance unchanged', () => {
    const custom = new Diagnostics(nullReporter, new DefaultPolicy({}))
    expect(resolveDiagnostics(custom, warnDiagnostics)).toBe(custom)
  })
})
