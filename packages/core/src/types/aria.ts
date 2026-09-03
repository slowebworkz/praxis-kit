import type { IntrinsicProps } from '@praxis-kit/primitive'

export type {
  AriaEngine,
  AriaContext,
  AriaFix,
  AriaFixResult,
  AriaInvalidResult as InvalidResult,
  AriaInvalidWithFix as InvalidWithFix,
  AriaInvalidWithoutFix as InvalidWithoutFix,
  AriaPhase,
  AriaResult,
  AriaRule,
  FixKind,
  RemoveAttributeFixKind,
  Severity,
  ValidResult,
} from '@praxis-kit/primitive'

/** Result of running props through the ARIA policy engine. */
export type AriaPipelineResult = { props: IntrinsicProps }
