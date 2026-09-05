/**
 * Claim: importing the pipeline engine alone pulls in zero compiler, adapter,
 * or style domain code. The engine is self-contained.
 *
 * `../pk`'s `@praxis-kit/pipeline` exposes a builder-chain API
 * (`startPipeline().then().build()`); this repo's clean-room reconstruction has a
 * differently-shaped engine (`runPipeline` + `phasedPipeline` execute a pipeline,
 * `mergeContext`/`mergeResults`/`shallowDiff` are its context-merge primitives) —
 * different names, same "engine alone, nothing else" claim this scenario tests.
 */
import {
  runPipeline,
  phasedPipeline,
  mergeContext,
  mergeResults,
  shallowDiff,
  PIPELINE_PHASES,
} from '@praxis-kit/pipeline'

export { runPipeline, phasedPipeline, mergeContext, mergeResults, shallowDiff, PIPELINE_PHASES }
