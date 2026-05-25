import { AriaPolicyEngine, diagnoseChildren } from '@polymorphic-ui/contract'
import type { ChildViolation, ValidationViolation } from '@polymorphic-ui/contract'
import { diagnoseClassPipeline } from '@polymorphic-ui/styling'
import type { ClassDiagnosis } from '@polymorphic-ui/styling'
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
  variantKey?: string,
): ComponentDiagnosis {
  const classes = diagnoseClassPipeline(options, tag, props, className, variantKey)

  let aria: ReadonlyArray<ValidationViolation>
  if (options.ariaRules?.length) {
    // strict:false silences report() so validate() returns violations without throwing/warning
    const engine = new AriaPolicyEngine(false, { rules: options.ariaRules })
    aria = engine.validate(tag, props as IntrinsicProps).violations
  } else {
    aria = AriaPolicyEngine.evaluate(tag, props as IntrinsicProps).violations
  }

  const childViolations = diagnoseChildren(options.childRules ?? [], children ?? [])

  return { classes, aria, children: childViolations }
}
