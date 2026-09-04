export {
  assertNever,
  cn,
  createObservable,
  mergeProps,
  wrapMethodForDetection,
} from '@praxis-kit/primitive'
export type { Observable, WrappedMethod } from '@praxis-kit/primitive'
// The state-prop normalizers moved to the dedicated `@praxis-kit/core/props` entry
// (`src/props.ts`) — they were never a "utils" concern. See DECISIONS.md.
export {
  COMPONENT_DEFAULT_TAG,
  COMPONENT_ID,
  getComponentDefaultTag,
  isComponent,
  isTag,
  markComponentTag,
} from '@praxis-kit/primitive'
export type { WithComponentId } from '@praxis-kit/primitive'
