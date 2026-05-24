import { SlotValidator as BaseSlotValidator } from '@polymorphic-ui/adapter-utils'
import type { StrictMode } from '@polymorphic-ui/core'

export class SlotValidator extends BaseSlotValidator {
  constructor(name: string, strict: StrictMode) {
    super(name, strict, 'Preact element')
  }
}
