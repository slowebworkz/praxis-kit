import type { ESLintConfig } from './configs/types'

import architecture from './configs/architecture.js'

const config = [...architecture] satisfies ESLintConfig

export default config
