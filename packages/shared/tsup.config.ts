import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types/index.ts',
    'types/primitives': 'src/types/primitives/index.ts',
    'types/variants': 'src/types/variants/index.ts',
    'types/contracts': 'src/types/contracts/index.ts',
    'types/validation': 'src/types/validation/index.ts',
    'types/config': 'src/types/config/index.ts',
    'types/capabilities': 'src/types/capabilities/index.ts',
    'constants/primitive': 'src/constants/primitive/index.ts',
    'constants/aria': 'src/constants/aria/index.ts',
    'guards/aria': 'src/guards/aria/index.ts',
    'guards/capabilities': 'src/guards/capabilities/index.ts',
    'guards/contract': 'src/guards/contract/index.ts',
    'guards/foundational': 'src/guards/foundational/index.ts',
    'guards/primitive': 'src/guards/primitive/index.ts',
    'guards/variants': 'src/guards/variants/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
})
