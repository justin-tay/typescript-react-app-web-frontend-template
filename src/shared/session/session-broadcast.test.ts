import { afterEach, describe, expect, it, vi } from 'vitest'
import { broadcastSignedOut, goToLoggedOutPage, listenForSignedOutElsewhere } from './session-broadcast'

afterEach(() => {
  vi.unstubAllGlobals()
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

  it('does not navigate again if already on the login page', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign, pathname: '/login' })

    goToLoggedOutPage()

    expect(assign).not.toHaveBeenCalled()
  })

  it('navigates to the logged-out login page otherwise', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign, pathname: '/users' })

    goToLoggedOutPage()

    expect(assign).toHaveBeenCalledWith('/login?logout')
  })
})
