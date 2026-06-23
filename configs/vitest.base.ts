import { defineConfig } from 'vitest/config'
import type { InlineConfig } from 'vitest/node'

export function defineLibConfig(
  name: string,
  overrides: InlineConfig = {},
): ReturnType<typeof defineConfig> {
  return defineConfig({
    resolve: { tsconfigPaths: true },
    test: { name, include: ['src/**/*.{test,spec}.ts'], ...overrides },
  })
}

export function defineJsdomConfig(
  name: string,
  overrides: InlineConfig = {},
): ReturnType<typeof defineConfig> {
  return defineConfig({
    resolve: { tsconfigPaths: true },
    test: { name, include: ['src/**/*.{test,spec}.ts'], environment: 'jsdom', ...overrides },
  })
}
