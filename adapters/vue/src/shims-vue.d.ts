declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  import type { AnyRecord } from '@praxis-kit/primitive'
  const component: DefineComponent<AnyRecord, AnyRecord, unknown>
  export default component
}
