// @vitest-environment node
import { createElement } from 'react'
import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { ssrConformanceSuite } from '@praxis-ui/adapter-utils/testing'
import type { BareFactoryOptions } from '@praxis-ui/adapter-utils/testing'
import type { UnknownProps } from '@/shared'
import { createContractComponent } from './create-contract-component'

ssrConformanceSuite({
  createComponent: (options) =>
    createContractComponent(options as BareFactoryOptions) as ComponentType<UnknownProps> & {
      displayName?: string
    },
  renderToString: (component, props = {}) => {
    const { class: cls, ...rest } = props
    const normalized = cls !== undefined ? { ...rest, className: cls } : rest
    return renderToString(
      createElement(component as ComponentType<UnknownProps>, normalized as UnknownProps),
    )
  },
})
