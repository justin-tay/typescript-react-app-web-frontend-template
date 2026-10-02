import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionTimeoutMonitor, type SessionTimeoutOptions } from './session-timeout'

const IDLE_TIMEOUT_MS = 10_000
const PROMPT_BEFORE_MS = 2_000

function createMonitor(overrides: Partial<SessionTimeoutOptions> = {}) {
  const extend = vi.fn().mockResolvedValue(undefined)
  const onPromptChange = vi.fn()
  const onExpired = vi.fn()
  const monitor = new SessionTimeoutMonitor({
    idleTimeoutMs: IDLE_TIMEOUT_MS,
    promptBeforeMs: PROMPT_BEFORE_MS,
    extend,
    onPromptChange,
    onExpired,
    ...overrides,
  })
  return { monitor, extend, onPromptChange, onExpired }
}

describe('SessionTimeoutMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('prompts promptBeforeMs before the idle deadline when there is no recent local activity', async () => {
    const { monitor, onPromptChange } = createMonitor()
    monitor.start()

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS)
    expect(onPromptChange).toHaveBeenCalledWith(true, expect.any(Number))

    monitor.stop()
  })

  it('expires if the prompt is never answered', async () => {
    const { monitor, onExpired } = createMonitor()
    monitor.start()

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS)
    expect(onExpired).toHaveBeenCalledOnce()

    monitor.stop()
  })

  it('silently extends instead of prompting when there has been recent local activity', async () => {
    const { monitor, extend, onPromptChange } = createMonitor()
    monitor.start()

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS - 100)
    window.dispatchEvent(new Event('mousemove'))
    await vi.advanceTimersByTimeAsync(100)

    expect(extend).toHaveBeenCalledOnce()
    expect(onPromptChange).not.toHaveBeenCalledWith(true, expect.any(Number))

    monitor.stop()
  })

  it('extendNow resets the deadline', async () => {
    const { monitor, extend, onExpired } = createMonitor()
    monitor.start()

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS)
    await monitor.extendNow()
    expect(extend).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS - 100)
    expect(onExpired).not.toHaveBeenCalled()

    monitor.stop()
  })

  it('syncs across two instances (tabs) over BroadcastChannel', async () => {
    const a = createMonitor()
    const b = createMonitor()
    a.monitor.start()
    b.monitor.start()

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS - 100)
    a.monitor.noteServerActivity()
    // Let the BroadcastChannel message reach the other instance.
    await vi.advanceTimersByTimeAsync(0)

    // b's deadline should have moved out too, so it should not prompt at the original time.
    await vi.advanceTimersByTimeAsync(200)
    expect(b.onPromptChange).not.toHaveBeenCalledWith(true, expect.any(Number))

    a.monitor.stop()
    b.monitor.stop()
  })

  it('silently extends when the person was active in another tab', async () => {
    const a = createMonitor()
    const b = createMonitor()
    a.monitor.start()
    b.monitor.start()

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS - 100)
    window.dispatchEvent(new Event('mousemove'))
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(100)

    // Both monitors share this window, so both saw the event; what matters is that neither prompts.
    expect(a.onPromptChange).not.toHaveBeenCalledWith(true, expect.any(Number))
    expect(b.onPromptChange).not.toHaveBeenCalledWith(true, expect.any(Number))
    a.monitor.stop()
    b.monitor.stop()
  })

  describe('with Web Locks', () => {
    const stubLocks = () => {
      let held = false
      vi.stubGlobal('navigator', {
        locks: {
          // ifAvailable: the callback gets null while another request holds the lock.
          request: async (_name: string, _options: unknown, task: (lock: object | null) => Promise<unknown>) => {
            if (held) return task(null)
            held = true
            try {
              return await task({})
            } finally {
              held = false
            }
          },
        },
      })
    }

    afterEach(() => vi.unstubAllGlobals())

    it('makes only one request when several tabs extend at the same moment', async () => {
      stubLocks()
      const a = createMonitor()
      const b = createMonitor()
      a.monitor.start()
      b.monitor.start()

      await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS - 100)
      window.dispatchEvent(new Event('mousemove'))
      await vi.advanceTimersByTimeAsync(100)

      expect(a.extend.mock.calls.length + b.extend.mock.calls.length).toBe(1)
      a.monitor.stop()
      b.monitor.stop()
    })

    it('prompts after a grace period if the tab that held the lock never finishes', async () => {
      stubLocks()
      const never = new Promise<void>(() => {})
      const a = createMonitor({ extend: vi.fn().mockReturnValue(never) })
      const b = createMonitor()
      a.monitor.start()
      b.monitor.start()

      await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS - 100)
      window.dispatchEvent(new Event('mousemove'))
      await vi.advanceTimersByTimeAsync(100)
      expect(b.onPromptChange).not.toHaveBeenCalledWith(true, expect.any(Number))

      await vi.advanceTimersByTimeAsync(3_000)
      expect(b.onPromptChange).toHaveBeenCalledWith(true, expect.any(Number))
      a.monitor.stop()
      b.monitor.stop()
    })
  })
})
