import { beforeMount, afterMount } from '@playwright/experimental-ct-vue/hooks'

beforeMount<Record<string, unknown>>(async () => {
  // Global setup for all CT tests — add context providers here if needed.
})

afterMount<Record<string, unknown>>(async () => {
  // Global teardown after each mounted component.
})
