// @vitest-environment jsdom
import {
  conformanceSuite,
  conformanceA11ySuite,
  conformancePerformanceSuite,
  conformanceIsolationSuite,
} from '@praxis-kit/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-kit/adapter-utils/testing'
import { makeReactConformanceAdapter } from '../shared/make-conformance-adapter'
import type { ReactConformanceComponent } from '../shared/make-conformance-adapter'
import { createContractComponent } from './create-contract-component'

const adapter = makeReactConformanceAdapter(
  (options) => createContractComponent(options as BareFactoryOptions) as ReactConformanceComponent,
)

conformanceSuite(adapter)
conformanceA11ySuite(adapter)
conformancePerformanceSuite(adapter)
conformanceIsolationSuite(adapter)
