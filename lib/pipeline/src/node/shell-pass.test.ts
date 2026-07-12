import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { shellPass } from './shell-pass'

describe('shellPass', () => {
  it('resolves an empty PassResult when the command exits 0', async () => {
    const pass = shellPass('ok', process.execPath, ['-e', 'process.exit(0)'])
    await expect(pass.execute({})).resolves.toEqual({})
  })

  it('rejects when the command exits non-zero', async () => {
    const pass = shellPass('fail', process.execPath, ['-e', 'process.exit(1)'])
    await expect(pass.execute({})).rejects.toThrow(/Pass "fail" failed:.*exited with code 1/)
  })

  it('rejects when the command cannot be spawned', async () => {
    const pass = shellPass('missing', '/no/such/binary-xyz')
    await expect(pass.execute({})).rejects.toThrow(/ENOENT|spawn/i)
  })

  it('rejects with the terminating signal when the process is killed', async () => {
    const pass = shellPass('signal', process.execPath, [
      '-e',
      'process.kill(process.pid, "SIGTERM")',
    ])
    await expect(pass.execute({})).rejects.toThrow(/SIGTERM/)
  })

  describe('cwd', () => {
    let previous: string | undefined

    beforeEach(() => {
      previous = process.env['EXPECTED_CWD']
    })

    afterEach(() => {
      if (previous === undefined) delete process.env['EXPECTED_CWD']
      else process.env['EXPECTED_CWD'] = previous
    })

    it('runs in the given cwd', async () => {
      process.env['EXPECTED_CWD'] = process.cwd()
      const pass = shellPass(
        'cwd-check',
        process.execPath,
        ['-e', 'process.exit(process.cwd() === process.env.EXPECTED_CWD ? 0 : 1)'],
        { cwd: process.cwd() },
      )
      await expect(pass.execute({})).resolves.toEqual({})
    })
  })

  it('passes the given env to the child process', async () => {
    const pass = shellPass(
      'env-check',
      process.execPath,
      ['-e', 'process.exit(process.env.FOO_TEST === "bar" ? 0 : 1)'],
      { env: { ...process.env, FOO_TEST: 'bar' } },
    )
    await expect(pass.execute({})).resolves.toEqual({})
  })

  it('rejects when aborted', async () => {
    const controller = new AbortController()
    const pass = shellPass('abort', process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], {
      signal: controller.signal,
    })
    const promise = pass.execute({})
    controller.abort()
    await expect(promise).rejects.toThrow()
  })

  it('carries the pass name', () => {
    const pass = shellPass('named', process.execPath)
    expect(pass.name).toBe('named')
  })
})
