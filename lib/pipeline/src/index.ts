export type * from './types'
export { detectConflicts, mergeContext, mergeResults, shallowDiff } from './merge'
export { ParallelConflictError, runPipeline, type RunResult } from './run'
export {
  PIPELINE_PHASES,
  phasedPipeline,
  type PhaseNodes,
  type PipelinePhase,
} from './phases'
