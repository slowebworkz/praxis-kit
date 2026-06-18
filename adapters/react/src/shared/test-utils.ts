import { beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { UnknownProps } from './types'
import type { PolymorphicComponent } from './types/polymorphic-props'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function box(comp: PolymorphicComponent<any>): ComponentType<UnknownProps> {
  return comp as ComponentType<UnknownProps>
}

export function useReactDom() {
  let _container: HTMLElement
  let _root: ReturnType<typeof createRoot>

  beforeEach(() => {
    _container = document.createElement('div')
    document.body.appendChild(_container)
    _root = createRoot(_container)
  })

  afterEach(() => {
    act(() => {
      _root.unmount()
    })
    document.body.removeChild(_container)
  })

  return {
    get container(): HTMLElement {
      return _container
    },
    mount(element: ReactElement) {
      act(() => {
        _root.render(element)
      })
    },
  }
}

export const div = (props: UnknownProps = {}): ReactElement => createElement('div', props)
export const span = (props: UnknownProps = {}): ReactElement => createElement('span', props)
