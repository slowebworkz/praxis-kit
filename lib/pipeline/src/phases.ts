import type { Pipeline, PipelineNode } from './types'

/** The four canonical phases of a praxis pipeline, in execution order. Naming is
 *  framework-neutral — the pipeline package assigns no meaning beyond ordering:
 *
 *  - `normalize` — canonicalise raw input into a stable internal shape.
 *  - `enrich`    — derive and attach whatever later phases need.
 *  - `validate`  — check invariants; report problems as diagnostics, don't throw.
 *  - `emit`      — produce the output form from the settled context.
 *
 *  A phased pipeline is just an ordinary `Pipeline` whose top-level nodes are
 *  these phases as nested sub-pipelines, so it runs through `runPipeline`
 *  unchanged. */
export const PIPELINE_PHASES = ['normalize', 'enrich', 'validate', 'emit'] as const

export type PipelinePhase = (typeof PIPELINE_PHASES)[number]

/** The nodes to run in each phase. Every phase is optional; a phase with no
 *  nodes (absent or empty) is left out of the built pipeline entirely rather
 *  than run as an empty sub-pipeline. */
export type PhaseNodes<TContext> = Partial<
  Record<PipelinePhase, readonly PipelineNode<TContext>[]>
>

/** Build a `Pipeline` from per-phase node lists. Phases always run in
 *  `PIPELINE_PHASES` order regardless of the key order of `phases`, and each
 *  non-empty phase becomes a nested sub-pipeline named after the phase — so a
 *  `RunResult`'s diagnostics and any tooling walking the tree can attribute
 *  work to a phase. */
export function phasedPipeline<TContext>(
  name: string,
  phases: PhaseNodes<TContext>,
): Pipeline<TContext> {
  const nodes = PIPELINE_PHASES.filter(
    (phase) => (phases[phase]?.length ?? 0) > 0,
  ).map<Pipeline<TContext>>((phase) => ({
    name: phase,
    nodes: phases[phase] as readonly PipelineNode<TContext>[],
  }))

  return { name, nodes }
}
