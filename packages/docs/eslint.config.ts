import type { ESLintConfig } from '../../configs/types'

import base from '../../configs/base.js'
import ts from '../../configs/typescript.js'

const config = [...base, ...ts] satisfies ESLintConfig

export default config
