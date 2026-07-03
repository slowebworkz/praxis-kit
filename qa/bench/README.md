# @praxis-kit/bench

Benchmark suites for all capability layers. The headline suite compares a praxis-kit Tabs compound
component against a hand-rolled React implementation with identical DOM and ARIA wiring, isolating
the cost of automatic enforcement (class pipeline, ARIA engine, children validation).

```bash
pnpm --filter @praxis-kit/bench bench:render
```

Results are indicative (jsdom, warm LRU caches), not CI-gated — regressions with an order-of-
magnitude smell matter; single-digit percentages don't. Historical findings live in
[docs/examples.md](../../docs/examples.md).
