import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

export const HtmlDiagnostics = {
  emptyRole(tag: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlEmptyRole,
      category: DiagnosticCategory.HTML,
      message: `<${tag}> has an explicit empty role="". Omit the attribute instead.`,
    }
  },

  implicitRoleRedundant(tag: string, implicitRole: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlImplicitRoleRedundant,
      category: DiagnosticCategory.HTML,
      message: `<${tag}> already has implicit role="${implicitRole}". Avoid redundant role assignment.`,
    }
  },

  implicitRoleOverride(tag: string, implicitRole: string, role: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlImplicitRoleOverride,
      category: DiagnosticCategory.HTML,
      message: `<${tag}> should not override its implicit role="${implicitRole}" with role="${role}".`,
    }
  },

  standaloneRegionOverride(tag: string, implicitRole: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlStandaloneRegionOverride,
      category: DiagnosticCategory.HTML,
      message: `<${tag}> is a self-contained element with implicit role="${implicitRole}". Assigning role="region" has been removed.`,
    }
  },

  landmarkRoleOverride(tag: string, implicitRole: string, role: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlLandmarkRoleOverride,
      category: DiagnosticCategory.HTML,
      message: `<${tag}> has a fixed landmark role="${implicitRole}". role="${role}" overrides it and confuses assistive technology. The override has been removed.`,
    }
  },

  invalidChild(child: string, parent: string, allowed: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlInvalidChild,
      category: DiagnosticCategory.HTML,
      message: `<${child}> is not a valid direct child of <${parent}>. Allowed: ${allowed}.`,
    }
  },
}
