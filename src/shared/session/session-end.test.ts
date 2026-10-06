import { afterEach, describe, expect, it, vi } from 'vitest'
import { endSession, hasSessionExpired, onSessionEnd } from './session-end'

afterEach(() => {
  sessionStorage.clear()
})

const otherTabHearing = () => {
  const otherTab = new BroadcastChannel('app:session')
  const heard = vi.fn()
  otherTab.addEventListener('message', (e: MessageEvent) => heard(e.data))
  return { otherTab, heard }
}

describe('session-end', () => {
  it("forgets the previous person's saved table state and nothing else", () => {
    sessionStorage.setItem('table-state:users', '{}')
    sessionStorage.setItem('unrelated', 'kept')

    endSession('signed-out')

    expect(sessionStorage.getItem('table-state:users')).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('kept')
  })

  it('remembers an expired session, and forgets it again on a deliberate sign-out', () => {
    endSession('expired')
    expect(hasSessionExpired()).toBe(true)

    endSession('signed-out')
    expect(hasSessionExpired()).toBe(false)
  })

  it('tells other tabs why the session ended', async () => {
    const { otherTab, heard } = otherTabHearing()

    endSession('expired')
    await vi.waitFor(() => expect(heard).toHaveBeenLastCalledWith('expired'))
    endSession('signed-out')
    await vi.waitFor(() => expect(heard).toHaveBeenLastCalledWith('signed-out'))

    otherTab.close()
  })

  it("runs this tab's own listener, after the flag is set and the table state forgotten", () => {
    sessionStorage.setItem('table-state:users', '{}')
    const seen: unknown[] = []
    const stop = onSessionEnd((reason) =>
      seen.push([reason, hasSessionExpired(), sessionStorage.getItem('table-state:users')]),
    )

    endSession('expired')

    expect(seen).toEqual([['expired', true, null]])
    stop()
  })

  it("leaves this tab's listener alone when the caller is taking the tab elsewhere, but still tells the rest", async () => {
    const { otherTab, heard } = otherTabHearing()
    const listener = vi.fn()
    const stop = onSessionEnd(listener)

    endSession('expired', { notifyThisTab: false })

    expect(listener).not.toHaveBeenCalled()
    expect(hasSessionExpired()).toBe(true)
    await vi.waitFor(() => expect(heard).toHaveBeenCalledWith('expired'))
    stop()
    otherTab.close()
  })

  it('does nothing more once the listener is removed', () => {
    const listener = vi.fn()
    onSessionEnd(listener)()

    endSession('expired')

    expect(listener).not.toHaveBeenCalled()
  })

  describe('when another tab ends the session', () => {
    it('forgets table state, sets the flag, and tells the listener why, without broadcasting again', async () => {
      sessionStorage.setItem('table-state:users', '{}')
      const otherTab = new BroadcastChannel('app:session')
      const echoed = vi.fn()
      const second = new BroadcastChannel('app:session')
      second.addEventListener('message', echoed)
      const listener = vi.fn()
      const stop = onSessionEnd(listener)

      otherTab.postMessage('expired')
      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith('expired'))
      // A re-broadcast would reach `second`; the original message does too, so allow exactly that one.
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(sessionStorage.getItem('table-state:users')).toBeNull()
      expect(hasSessionExpired()).toBe(true)
      expect(echoed).toHaveBeenCalledTimes(1)
      stop()
      otherTab.close()
      second.close()
    })

    it('forgets the flag when the other tab signed out on purpose', async () => {
      endSession('expired')
      const otherTab = new BroadcastChannel('app:session')
      const listener = vi.fn()
      const stop = onSessionEnd(listener)

      otherTab.postMessage('signed-out')
      await vi.waitFor(() => expect(listener).toHaveBeenCalledWith('signed-out'))

      expect(hasSessionExpired()).toBe(false)
      stop()
      otherTab.close()
    })
  })
})
