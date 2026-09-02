export type * from './types'
export { detectConflicts, mergeContext, mergeResults } from './merge'
export { runPipeline, type RunResult } from './run'
export {
  PIPELINE_PHASES,
  phasedPipeline,
  type PhaseNodes,
  type PipelinePhase,
} from './phases'
