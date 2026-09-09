import { AriaPolicyEngine, diagnoseChildren } from '@praxis-kit/contract'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { ChildViolation, ValidationViolation } from '@praxis-kit/contract'
import { diagnoseClassPipeline } from '@praxis-kit/styling'
import type { ClassDiagnosis } from '@praxis-kit/styling'
import type { AnyRecord, ElementType, IntrinsicProps, ResolvedFactoryOptions } from './types'

export type ComponentDiagnosis = {
  classes: ClassDiagnosis
  aria: readonly ValidationViolation[]
  children: readonly ChildViolation[]
}

export function diagnose(
  options: ResolvedFactoryOptions,
  tag: ElementType,
  props: AnyRecord,
  children?: unknown[],
  className?: string,
  recipe?: string,
): ComponentDiagnosis {
  const classes = diagnoseClassPipeline(options, tag, props, className, recipe)

  let aria: readonly ValidationViolation[]
  // Both branches evaluate the always-on built-in HTML/ARIA rule pipeline; the `if` only avoids
  // constructing an engine when there are no extra `enforcement.aria` rules to layer on. An empty
  // `ariaRules` is equivalent to `undefined` here (there is no "disable ARIA" state) — consistent
  // with `createAriaPipeline`.
  if (options.ariaRules?.length) {
    const engine = new AriaPolicyEngine(silentDiagnostics, {
      rules: options.ariaRules,
    })
    aria = engine.validate(tag, props as IntrinsicProps).violations
  } else {
    aria = AriaPolicyEngine.evaluate(tag, props as IntrinsicProps).violations
  }

  const childViolations = diagnoseChildren(
    options.childRules ?? [],
    children ?? [],
    options.displayName ?? 'Component',
    {
      exclusiveChildren: options.exclusiveChildren,
      allowText: options.allowText,
    },
    { tag, props },
  )

  return { classes, aria, children: childViolations }
}
