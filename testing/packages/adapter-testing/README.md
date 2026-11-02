# @praxis-kit/adapter-testing

The cross-framework adapter conformance suites. Each adapter supplies a small `ConformanceAdapter`
(create / render / rerender / cleanup / capabilities) and runs the same assertions as every other
adapter, so behavioural drift between frameworks shows up as a test failure instead of in review.

Suites: `conformanceSuite`, `conformanceA11ySuite`, `conformancePerformanceSuite`,
`conformanceIsolationSuite`, `ssrConformanceSuite`, `hydrationParitySuite`.

Private and source-exporting; consumed as a `devDependency` by `adapters/*`. Requires `vitest` as a
peer dependency. See [`../../README.md`](../../README.md) for the workspace rules.
