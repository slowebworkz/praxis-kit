import { isObject, isDefined } from '@praxis-kit/guards'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { Diagnostics } from '@praxis-kit/diagnostics'

/**
 * Warn when composition-only options are supplied without a composition target.
 * Presence is intentional: `allProps: false` and `defaults: {}` are still explicit
 * configuration, while an empty `compose: {}` is not actionable and stays quiet.
 */
export function diagnoseIncompleteComposition(
  compose: unknown,
  componentName: string | undefined,
  diagnostics: Pick<Diagnostics, 'warn'>,
): void {
  if (!isObject(compose, true) || isDefined(compose.with)) return

  const suppliedOptions = (['allProps', 'defaults'] as const).filter((key) =>
    Object.hasOwn(compose, key),
  )
  if (suppliedOptions.length === 0) return

  const optionNames = suppliedOptions.map((key) => `compose.${key}`).join(' and ')
  const verb = suppliedOptions.length === 1 ? 'has' : 'have'
  diagnostics.warn({
    code: DiagnosticCode.CompositionOptionsWithoutWith,
    category: DiagnosticCategory.Composition,
    message: `${optionNames} ${verb} no effect without compose.with.`,
    ...(isDefined(componentName) && { component: componentName }),
  })
}
