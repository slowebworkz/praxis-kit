import type { EmptyRecord } from '../primitives'
import type { ClassPlugin } from '../class'

export type RuntimePluginField<TPlugin extends ClassPlugin | undefined> =
  TPlugin extends ClassPlugin
    ? { readonly classPlugin: TPlugin; readonly hasStyling: true }
    : EmptyRecord
