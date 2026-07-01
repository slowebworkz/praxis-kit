/**
 * Claim: importing the PK2 pipeline engine alone pulls in zero compiler,
 * adapter, or style domain code. The engine is self-contained.
 */
import {
  startPipeline,
  executePipeline,
  executeProcessor,
  createPipeline,
} from '@praxis-kit/pipeline'

export { startPipeline, executePipeline, executeProcessor, createPipeline }
