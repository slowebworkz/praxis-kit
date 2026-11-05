import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import { isDefined, isUndefined } from '@praxis-kit/guards'
import type { Severity as AriaSeverity, StringMap } from '@praxis-kit/primitive'

// A fixed-severity fact about HTML/ARIA-in-HTML validity. The same diagnostic always carries the
// same severity, so it's declared once here rather than re-decided at every call site — callers
// (`AriaRule` implementations) just forward `diagnostic.severity` into the `AriaResult` they
// return. `AriaSeverity` ('error' | 'warning') is the string-literal severity `AriaResult`/
// `Diagnostics.report()` actually branch on — distinct from `@praxis-kit/diagnostics`' numeric
// `Severity` enum used by `Diagnostic` itself.
type Fact = DiagnosticInput & { readonly severity: AriaSeverity }

// One `DiagnosticCode` per attribute (HTML3102–3111, see `codes.ts`) rather than one shared code —
// each is independently documentable/lookupable, the same way a compiler assigns a distinct code
// per diagnosable fact rather than one generic "type error" code.
const ATTRIBUTE_IGNORED_CODES = {
  checked: DiagnosticCode.HtmlInputCheckedIgnoredForType,
  multiple: DiagnosticCode.HtmlInputMultipleIgnoredForType,
  maxLength: DiagnosticCode.HtmlInputMaxLengthIgnoredForType,
  minLength: DiagnosticCode.HtmlInputMinLengthIgnoredForType,
  pattern: DiagnosticCode.HtmlInputPatternIgnoredForType,
  min: DiagnosticCode.HtmlInputMinIgnoredForType,
  max: DiagnosticCode.HtmlInputMaxIgnoredForType,
  step: DiagnosticCode.HtmlInputStepIgnoredForType,
  accept: DiagnosticCode.HtmlInputAcceptIgnoredForType,
  capture: DiagnosticCode.HtmlInputCaptureIgnoredForType,
  size: DiagnosticCode.HtmlInputSizeIgnoredForType,
  alt: DiagnosticCode.HtmlInputAltIgnoredForType,
  height: DiagnosticCode.HtmlInputHeightIgnoredForType,
  width: DiagnosticCode.HtmlInputWidthIgnoredForType,
} as const satisfies Readonly<StringMap<DiagnosticCode>>

/** The `<input>` attributes that have a dedicated "ignored for this type" diagnostic code. */
export type InputIgnoredAttribute = keyof typeof ATTRIBUTE_IGNORED_CODES

type Context = Readonly<Record<string, unknown>>

// Builds a `Fact` from a code and the values its message interpolates. No prose lives here: the
// text is looked up in a message catalog at report time (see `aria.ts`). `messageId` lets several
// codes, or several shapes of one code, share a catalog entry.
function fact(
  code: DiagnosticCode,
  severity: AriaSeverity,
  context: Context,
  messageId?: string,
): Fact {
  return {
    code,
    category: DiagnosticCategory.HTML,
    severity,
    context,
    ...(isDefined(messageId) && { messageId }),
  }
}

export const HtmlDiagnostics = {
  emptyRole(tag: string): Fact {
    return fact(DiagnosticCode.HtmlEmptyRole, 'warning', { tag })
  },

  implicitRoleRedundant(tag: string, implicitRole: string): Fact {
    return fact(DiagnosticCode.HtmlImplicitRoleRedundant, 'warning', { tag, implicitRole })
  },

  implicitRoleOverride(tag: string, implicitRole: string, role: string): Fact {
    return fact(DiagnosticCode.HtmlImplicitRoleOverride, 'error', { tag, implicitRole, role })
  },

  standaloneRegionOverride(tag: string, implicitRole: string): Fact {
    return fact(DiagnosticCode.HtmlStandaloneRegionOverride, 'error', { tag, implicitRole })
  },

  landmarkRoleOverride(tag: string, implicitRole: string, role: string): Fact {
    return fact(DiagnosticCode.HtmlLandmarkRoleOverride, 'error', { tag, implicitRole, role })
  },

  // What the parent accepts, as data: a list of tags (written as `<li>`, which is how HTML names
  // them in any language), `'phrasing'` for the phrasing-content model, or nothing when the parent
  // has no simple summary. The two non-list shapes are their own message ids.
  invalidChild(
    child: string,
    parent: string,
    allowed: readonly string[] | 'phrasing' | undefined,
  ): Fact {
    if (isUndefined(allowed)) {
      return fact(
        DiagnosticCode.HtmlInvalidChild,
        'error',
        { child, parent },
        'HTML3007.unspecified',
      )
    }
    if (allowed === 'phrasing') {
      return fact(DiagnosticCode.HtmlInvalidChild, 'error', { child, parent }, 'HTML3007.phrasing')
    }
    return fact(DiagnosticCode.HtmlInvalidChild, 'error', { child, parent, allowed })
  },

  roleNotPermitted(tag: string, role: string, allowedRoles: readonly string[]): Fact {
    return fact(
      DiagnosticCode.HtmlRoleNotPermitted,
      'error',
      { tag, role, allowedRoles },
      allowedRoles.length > 0 ? undefined : 'HTML3008.none',
    )
  },

  // Reserved for <input>-specific facts (HTML3101–3199, see codes.ts) — later element families
  // (button, img, table, ...) get their own reserved block and their own namespace here.
  input: {
    unsupportedType(type: string): Fact {
      return fact(DiagnosticCode.HtmlInputUnsupportedType, 'warning', { type })
    },

    // The user-visible problem is that the attribute is ignored — not that it "requires" a type;
    // that's the rule's internal framing, not what the browser actually does.
    attributeIgnoredForType(
      attribute: InputIgnoredAttribute,
      type: string,
      allowedTypes: readonly string[],
    ): Fact {
      return fact(
        ATTRIBUTE_IGNORED_CODES[attribute],
        'warning',
        { attribute, type, allowedTypes },
        'HTML31xx.attributeIgnored',
      )
    },
  },

  // Reserved for <a>-specific facts (HTML3201–3299, see codes.ts).
  anchor: {
    dangerousHref(href: string): Fact {
      return fact(DiagnosticCode.HtmlAnchorDangerousHref, 'warning', { href })
    },
  },
}
