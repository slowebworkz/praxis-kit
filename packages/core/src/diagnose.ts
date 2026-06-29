import { AriaPolicyEngine, diagnoseChildren, diagnosticsFromStrictMode } from '@praxis-kit/contract'
import type { ChildViolation, ValidationViolation } from '@praxis-kit/contract'
import { diagnoseClassPipeline } from '@praxis-kit/styling'
import type { ClassDiagnosis } from '@praxis-kit/styling'
import type { AnyRecord, ElementType, IntrinsicProps, ResolvedFactoryOptions } from './types'

export type ComponentDiagnosis = {
  classes: ClassDiagnosis
  aria: ReadonlyArray<ValidationViolation>
  children: ReadonlyArray<ChildViolation>
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

  let aria: ReadonlyArray<ValidationViolation>
  if (options.ariaRules?.length) {
    // diagnosticsFromStrictMode(false) silences all output — validate() returns violations without side effects
    const engine = new AriaPolicyEngine(diagnosticsFromStrictMode(false), {
      rules: options.ariaRules,
    })
    aria = engine.validate(tag, props as IntrinsicProps).violations
  } else {
    aria = AriaPolicyEngine.evaluate(tag, props as IntrinsicProps).violations
  }

  const childViolations = diagnoseChildren(options.childRules ?? [], children ?? [])

  return { classes, aria, children: childViolations }
}
