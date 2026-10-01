import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ServiceUnavailable } from '@/shared/ui/service-unavailable'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** When this changes the boundary clears, so moving to another page leaves a crashed one behind. */
  resetKey?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  resetKey?: string
}

/**
 * Catches an error thrown while rendering what is inside it and shows a notice in its place,
 * instead of letting React unmount the whole page (a blank screen). Put it around a page's content,
 * outside the navigation, so a person can leave a broken page. The error itself goes to the console:
 * it is developer detail, not something to show.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true }
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): ErrorBoundaryState | null {
    return props.resetKey === state.resetKey ? null : { hasError: false, resetKey: props.resetKey }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A page failed to render.', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <ServiceUnavailable kind="failed" onRetry={() => this.setState({ hasError: false })} />
  }
}
