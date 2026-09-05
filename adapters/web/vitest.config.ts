import { defineJsdomConfig } from '../../configs/vitest.base'

export default defineJsdomConfig('@praxis-kit/web', {
  // forks mode isolates jsdom workers in subprocesses, preventing
  // HTMLElement circular references from overflowing vitest's IPC serializer.
  pool: 'forks',
})
