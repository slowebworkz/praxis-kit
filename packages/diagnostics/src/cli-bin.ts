import { run } from './cli'

// The executable entry (`bin` in package.json). Kept separate from `cli.ts` so importing `run` in a
// test never runs it, and so no "was I executed directly?" check is needed (those break when the
// file is reached through a package manager's bin symlink).
process.exitCode = run(process.argv.slice(2))
