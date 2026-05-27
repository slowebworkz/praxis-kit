import type { ESLintConfig } from '../../configs/types'

import base from '../../configs/base'
import ts from '../../configs/typescript'

const config = [...base, ...ts] satisfies ESLintConfig

export default config
