import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  broadcastSignedOut,
  declareSignedOut,
  listenForSignedOutElsewhere,
  setSessionEndedHandler,
} from './session-broadcast'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('session-broadcast', () => {
  it('notifies a listener when another "tab" broadcasts signed-out', async () => {
    // A BroadcastChannel never receives its own message, so the module's singleton
    // channel can't simulate "another tab" by itself; a second, independent channel of
    // the same name is what a real other tab would be.
    const otherTab = new BroadcastChannel('app:session')
    const onSignedOut = vi.fn()
    const unsubscribe = listenForSignedOutElsewhere(onSignedOut)

    otherTab.postMessage('signed-out')
    await vi.waitFor(() => expect(onSignedOut).toHaveBeenCalledOnce())

    unsubscribe()
    otherTab.close()
  })

  it('broadcastSignedOut reaches a listener in another "tab"', async () => {
    const otherTab = new BroadcastChannel('app:session')
    const onSignedOut = vi.fn()
    otherTab.addEventListener('message', onSignedOut)

    broadcastSignedOut()
    await vi.waitFor(() => expect(onSignedOut).toHaveBeenCalledOnce())
    otherTab.close()
  })

  it('declaring the session ended tells other tabs and runs this tab\'s own handler', async () => {
    const otherTab = new BroadcastChannel('app:session')
    const heardElsewhere = vi.fn()
    otherTab.addEventListener('message', heardElsewhere)
    const handler = vi.fn()
    const remove = setSessionEndedHandler(handler)

    declareSignedOut()

    expect(handler).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(heardElsewhere).toHaveBeenCalledOnce())
    remove()
    otherTab.close()
  })

  it('does nothing more once the handler is removed', () => {
    const handler = vi.fn()
    setSessionEndedHandler(handler)()

    declareSignedOut()

    expect(handler).not.toHaveBeenCalled()
  })

  it('forgets saved table state when the session ends', () => {
    sessionStorage.setItem('table-state:users', '{}')
    sessionStorage.setItem('unrelated', 'kept')

    broadcastSignedOut()

    expect(sessionStorage.getItem('table-state:users')).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('kept')
  })
})
