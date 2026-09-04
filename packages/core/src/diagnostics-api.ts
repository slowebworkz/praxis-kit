import type {
  Diagnostic,
  DiagnosticInput,
  Diagnostics as DiagnosticsImpl,
} from '@praxis-kit/diagnostics'

/**
 * The structural write-surface of a `Diagnostics` instance — what a consumer authoring a custom
 * `styling.plugin` (or any plugin the runtime hands a `Diagnostics` to) needs to call.
 *
 * Exported instead of the `@praxis-kit/diagnostics` **class** type on purpose: the class carries
 * `private` members, so its type is nominal — a plugin annotated against a class re-export would
 * only accept an instance produced by that exact bundled copy. A structural interface has no
 * identity, so any object of this shape satisfies it regardless of which entry point produced it.
 */
export interface Diagnostics {
  /** `false` ⇒ a `Warning` would be ignored by the policy — cheap gate to skip warning-level work. */
  readonly warnActive: boolean
  debug(input: DiagnosticInput): Diagnostic
  info(input: DiagnosticInput): Diagnostic
  warn(input: DiagnosticInput): Diagnostic
  error(input: DiagnosticInput): Diagnostic
  fatal(input: DiagnosticInput): Diagnostic
  report(diagnostic: Diagnostic): Diagnostic
}

// Compile-time guard: the real class must stay assignable to this interface. If `Diagnostics`
// (the class) grows a method consumers depend on, add it above; a failure here means they drifted.
const _inSync: DiagnosticsImpl extends Diagnostics ? true : never = true
void _inSync
