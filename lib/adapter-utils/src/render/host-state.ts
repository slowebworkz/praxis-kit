import type { AnyRecord, ElementType } from '@praxis-kit/core'
import { enforceAllowedAs } from '@praxis-kit/core'
import { isObject } from '@praxis-kit/primitive'
import { applyFilter } from '../props'
import type { SsrBundle } from './render-to-string'

/**
 * Runtime shape guard for the value returned by an adapter's buildRuntime() —
 * shared between Lit and Web, whose bundle shape (and validation needs) are
 * identical. childrenEvaluator is optional and adapter-owned; not part of
 * SsrBundle's declared type since resolveHostState below never reads it, but
 * still checked here since a malformed one indicates a real construction bug.
 */
export function isLooseBundle(arg: unknown): arg is SsrBundle {
  if (!isObject(arg)) return false

  const { runtime, filterProps, childrenEvaluator } = arg as AnyRecord
  if (!isObject(runtime)) return false
  if (!isObject((runtime as AnyRecord)['options'])) return false
  if (
    typeof (runtime as AnyRecord)['resolveTag'] !== 'function' ||
    typeof (runtime as AnyRecord)['resolveProps'] !== 'function' ||
    typeof (runtime as AnyRecord)['resolveClasses'] !== 'function' ||
    typeof (runtime as AnyRecord)['resolveAria'] !== 'function'
  )
    return false

  if (typeof filterProps !== 'function') return false

  if (
    childrenEvaluator !== undefined &&
    (!isObject(childrenEvaluator) ||
      typeof (childrenEvaluator as AnyRecord)['evaluate'] !== 'function')
  )
    return false

  return true
}

export function toLooseBundle(bundle: unknown): SsrBundle {
  if (!isLooseBundle(bundle)) {
    throw new Error('[createContractComponent] buildRuntime returned an unexpected shape.')
  }
  return bundle
}

export type HostState = { className: string; attributes: AnyRecord }

/**
 * Pure: resolves the class string and filtered attribute map from current props.
 * Shared between Lit and Web — same pipeline, only the surrounding element
 * lifecycle (how `props` gets built, when this gets called) differs per adapter.
 *
 * Separating resolution from DOM mutation keeps this testable without a real
 * DOM and keeps diffAndApplyAttributes a simple write-only function.
 */
export function resolveHostState(bundle: SsrBundle, props: AnyRecord): HostState {
  const { as, className, recipe, ...rest } = props
  const { options, resolveAria, resolveClasses, resolveProps, resolveTag } = bundle.runtime

  const tag = resolveTag(as as ElementType | undefined)
  if (options.allowedAs !== undefined) {
    enforceAllowedAs(tag, options.allowedAs, options.diagnostics, options.displayName)
  }
  const mergedProps = resolveProps(rest)
  const normalizedProps =
    typeof options.normalizeFn === 'function' ? options.normalizeFn(mergedProps) : mergedProps

  const htmlNormalizers = options.htmlPropNormalizersFn?.(tag)
  const finalProps = { ...normalizedProps }
  if (htmlNormalizers) {
    for (const normalize of htmlNormalizers) {
      Object.assign(finalProps, normalize(finalProps))
    }
  }

  const resolvedClass = resolveClasses(
    tag,
    finalProps,
    className as string | undefined,
    recipe as string | undefined,
  )
  const ariaResult = resolveAria(tag, finalProps)
  const attributes = applyFilter(ariaResult.props, bundle.filterProps, options.variantKeys)
  return { className: resolvedClass, attributes }
}

/**
 * Applies resolved state to a host element. Shared between Lit and Web — both
 * hosts are HTMLElement subclasses and the diffing algorithm is identical.
 *
 * `prevPipelineAttrs` tracks which attribute keys the pipeline set on the
 * previous run. Any key present there but absent from the new state is
 * explicitly removed, preventing stale pipeline-managed attributes from
 * accumulating across runs.
 *
 * Variant key attributes are intentionally never removed here — removing them
 * would re-trigger each adapter's own attribute-change callback (Lit's
 * requestUpdate, the native attributeChangedCallback), creating a feedback loop.
 */
export function diffAndApplyAttributes(
  host: HTMLElement,
  state: HostState,
  prevPipelineAttrs: Set<string>,
  incomingProps: AnyRecord,
): void {
  const hasOwn = Object.hasOwn
  const attrs = state.attributes

  host.className = state.className

  // Remove pipeline-managed attributes absent from the new state (e.g. a
  // filterProps target that was set last run but is gone this run).
  for (const key of prevPipelineAttrs) {
    if (!hasOwn(attrs, key)) host.removeAttribute(key)
  }
  prevPipelineAttrs.clear()

  // Remove aria-* and role attributes the ARIA engine stripped this run (e.g.
  // redundant role="navigation" on a <nav>). These are user-set, not
  // pipeline-set, so they're not covered by prevPipelineAttrs above.
  for (const key in incomingProps) {
    if (!hasOwn(incomingProps, key)) continue
    if (!key.startsWith('aria-') && key !== 'role') continue
    if (!hasOwn(attrs, key)) host.removeAttribute(key)
  }

  for (const key in attrs) {
    if (!hasOwn(attrs, key)) continue
    const value = attrs[key]
    if (value === undefined || value === null || value === false) {
      host.removeAttribute(key)
    } else if (value === true) {
      host.setAttribute(key, '')
      prevPipelineAttrs.add(key)
    } else {
      host.setAttribute(key, String(value))
      prevPipelineAttrs.add(key)
    }
  }
}
