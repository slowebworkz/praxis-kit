// Public surface for the tag-resolution and base type guards praxis-kit uses internally
// (ARIA/contract enforcement, slot resolution). Consumers authoring custom `enforcement.children`
// or `enforcement.aria` rules need the same symbol-aware tag resolution praxis-kit already has
// in-house, rather than hand-rolling it against `COMPONENT_DEFAULT_TAG` themselves.
export { isObject, isString } from '@praxis-kit/primitive'
export { isTag, getTag, isFlowContent } from '@praxis-kit/primitive'
export type { TagChild, FlowContentChild } from '@praxis-kit/primitive'
