import { useEffect, useRef, useState } from 'react'
import { fetchLoginUser } from './api'
import { useAuth } from './auth-context'
import { SessionTimeoutMonitor, setActiveSessionTimeoutMonitor } from './session-timeout'
import { SESSION_IDLE_TIMEOUT_MS, SESSION_PROMPT_BEFORE_MS } from '@/config'

export interface SessionTimeoutPrompt {
  isPrompted: boolean
  remainingMs: number
  extendError: string | null
  extendNow: () => void
}

/**
 * Runs a `SessionTimeoutMonitor` for as long as the user is signed in, and exposes its
 * prompt state for `SessionTimeoutModal`. Only one of these should be mounted at a time
 * (see `SessionTimeoutController`); it registers itself as the active monitor so the
 * shared fetch helpers can feed it ordinary API activity.
 */
export function useSessionTimeout(): SessionTimeoutPrompt {
  const { state, reload } = useAuth()
  const isAuthenticated = state.status === 'authenticated'
  const [isPrompted, setIsPrompted] = useState(false)
  const [remainingMs, setRemainingMs] = useState(0)
  const [extendError, setExtendError] = useState<string | null>(null)
  const monitorRef = useRef<SessionTimeoutMonitor | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    const monitor = new SessionTimeoutMonitor({
      idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
      promptBeforeMs: SESSION_PROMPT_BEFORE_MS,
      extend: async () => {
        await fetchLoginUser()
      },
      onPromptChange: (next, remaining) => {
        setIsPrompted(next)
        setRemainingMs(remaining)
        if (next) setExtendError(null)
      },
      onExpired: () => void reload(),
    })
    monitorRef.current = monitor
    setActiveSessionTimeoutMonitor(monitor)
    monitor.start()
    return () => {
      monitor.stop()
      setActiveSessionTimeoutMonitor(null)
      monitorRef.current = null
      setIsPrompted(false)
    }
  }, [isAuthenticated, reload])

  const extendNow = () => {
    setExtendError(null)
    monitorRef.current?.extendNow().catch((e: unknown) => {
      setExtendError(e instanceof Error ? e.message : String(e))
    })
  }

  return { isPrompted, remainingMs, extendError, extendNow }
}
