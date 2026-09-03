import { defineConfig } from 'vitest/config'
import type { InlineConfig } from 'vitest/node'

/**
 * The monorepo's shared Vitest defaults. `name` is package-specific and always
 * wins; `include` is enforced policy (it comes last, after `...overrides`).
 * Everything else — `environment: 'jsdom'`, `passWithNoTests`, setup files — is
 * per-package via `overrides`, so the API encodes defaults, not a fixed menu of
 * environment categories.
 *
 * `InlineConfig` (from `vitest/node`) is Vitest's `test`-config type
 * (`UserConfig.test`), not the whole user config — the right shape to spread
 * into `test:` here.
 */
export function defineLibConfig(
  name: string,
  overrides: InlineConfig = {},
): ReturnType<typeof defineConfig> {
  return defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
      ...overrides,
      name,
      include: ['src/**/*.{test,spec}.ts'],
    },
  })
}

/**
 * As `defineLibConfig`, but for framework-adapter packages: `environment: 'jsdom'`
 * and the include policy is `*.test.{ts,tsx}` — adapters keep `.test.tsx` next to
 * `.tsx` source, and reserve `.pw.spec.tsx` for the Playwright-CT runner (which
 * this must not pick up). Both are enforced (come last), so `overrides` carries
 * only the package-specific bits — `setupFiles`, `server.deps`, etc.
 */
export function defineJsdomConfig(
  name: string,
  overrides: InlineConfig = {},
): ReturnType<typeof defineConfig> {
  return defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
      ...overrides,
      name,
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  })
}
