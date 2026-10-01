/**
 * Warns of the backend's idle session timeout before it happens, with a chance to stay
 * signed in, kept in sync across every open tab of this origin.
 *
 * Deliberately decentralized: every tab keeps its own countdown to the same deadline and
 * broadcasts to the others whenever it learns the deadline moved, rather than one tab
 * being elected "leader" and owning a single canonical timer. That avoids needing a
 * failover case for when the leader tab closes, at no real cost here, since every tab can
 * independently compute the same deadline from the same activity timestamp.
 *
 * Only ever concerns the idle timeout, never the backend's separate absolute session
 * timeout: that one cannot be extended by activity at all, so a countdown for it would
 * offer nothing but a "your session will end" notice, which is a different, simpler
 * feature this class does not attempt. When this class's own countdown reaches zero, it
 * does not assume the session is dead — it asks the caller to confirm against the server
 * (see `onExpired`), which is also how an absolute-timeout expiry is naturally discovered
 * and reported, with no special-casing needed here (see `session-broadcast.ts`).
 */

const CHANNEL_NAME = 'app:session-timeout'

interface ActivityMessage {
  type: 'activity'
  at: number
}

export interface SessionTimeoutOptions {
  /** How long the backend allows a session to sit idle; mirror its own configured value. */
  idleTimeoutMs: number
  /** How long before the deadline to prompt, if there has been no recent local activity. */
  promptBeforeMs: number
  /** How recently the user must have moved the mouse/pressed a key to auto-extend silently. */
  recentLocalActivityWindowMs?: number
  /** Makes a request that resets the backend's idle timer, e.g. re-fetching `/login-user`. */
  extend: () => Promise<void>
  /** Called whenever the prompt should show or hide, with the time left when showing. */
  onPromptChange: (isPrompted: boolean, remainingMs: number) => void
  /** The local countdown reached zero with no extension; ask the server to confirm. */
  onExpired: () => void
}

const DEFAULT_RECENT_ACTIVITY_WINDOW_MS = 30_000

export class SessionTimeoutMonitor {
  private readonly options: Required<SessionTimeoutOptions>
  private readonly channel = new BroadcastChannel(CHANNEL_NAME)
  private lastServerActivityAt = Date.now()
  private lastLocalActivityAt = 0
  private promptTimer: ReturnType<typeof setTimeout> | null = null
  private expiryTimer: ReturnType<typeof setTimeout> | null = null
  private isRunning = false

  constructor(options: SessionTimeoutOptions) {
    this.options = { recentLocalActivityWindowMs: DEFAULT_RECENT_ACTIVITY_WINDOW_MS, ...options }
    this.handleMessage = this.handleMessage.bind(this)
    this.handleLocalActivity = this.handleLocalActivity.bind(this)
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.channel.addEventListener('message', this.handleMessage)
    for (const event of ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'] as const) {
      window.addEventListener(event, this.handleLocalActivity, { passive: true })
    }
    this.reschedule()
  }

  stop(): void {
    if (!this.isRunning) return
    this.isRunning = false
    this.channel.removeEventListener('message', this.handleMessage)
    for (const event of ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'] as const) {
      window.removeEventListener(event, this.handleLocalActivity)
    }
    this.clearTimers()
  }

  /** Call after any successful authenticated response; that request already reset the
   * backend's idle timer, so every open tab's countdown should reset too. */
  noteServerActivity(): void {
    const at = Date.now()
    this.applyServerActivity(at)
    this.channel.postMessage({ type: 'activity', at } satisfies ActivityMessage)
  }

  /** The prompt's "Stay signed in" button. */
  async extendNow(): Promise<void> {
    await this.options.extend()
    this.noteServerActivity()
  }

  private handleLocalActivity(): void {
    this.lastLocalActivityAt = Date.now()
  }

  private handleMessage(event: MessageEvent<ActivityMessage>): void {
    if (event.data?.type === 'activity') this.applyServerActivity(event.data.at)
  }

  private applyServerActivity(at: number): void {
    if (at <= this.lastServerActivityAt) return
    this.lastServerActivityAt = at
    this.setPrompted(false, 0)
    this.reschedule()
  }

  private reschedule(): void {
    this.clearTimers()
    const deadline = this.lastServerActivityAt + this.options.idleTimeoutMs
    const promptAt = deadline - this.options.promptBeforeMs
    const now = Date.now()
    this.promptTimer = setTimeout(() => this.onPromptDue(deadline), Math.max(0, promptAt - now))
  }

  private onPromptDue(deadline: number): void {
    const hasRecentLocalActivity = Date.now() - this.lastLocalActivityAt < this.options.recentLocalActivityWindowMs
    if (hasRecentLocalActivity) {
      // "Defer the firing": local activity alone never talks to the server on every
      // event; only at the moment a prompt would otherwise be needed is it consulted, to
      // decide a silent extension instead of bothering someone who is plainly still here.
      // If the silent extension itself fails (the session may already be gone), fall back
      // to the prompt rather than staying silent about it.
      this.extendNow().catch(() => this.promptNow(deadline))
      return
    }
    this.promptNow(deadline)
  }

  private promptNow(deadline: number): void {
    this.setPrompted(true, Math.max(0, deadline - Date.now()))
    this.expiryTimer = setTimeout(() => this.options.onExpired(), Math.max(0, deadline - Date.now()))
  }

  private setPrompted(isPrompted: boolean, remainingMs: number): void {
    this.options.onPromptChange(isPrompted, remainingMs)
  }

  private clearTimers(): void {
    if (this.promptTimer) clearTimeout(this.promptTimer)
    if (this.expiryTimer) clearTimeout(this.expiryTimer)
    this.promptTimer = null
    this.expiryTimer = null
  }
}

let activeMonitor: SessionTimeoutMonitor | null = null

/** Set by `useSessionTimeout` for as long as one is running; never called directly otherwise. */
export function setActiveSessionTimeoutMonitor(monitor: SessionTimeoutMonitor | null): void {
  activeMonitor = monitor
}

/**
 * Feeds "an authenticated request just succeeded" to whichever monitor is currently
 * running, if any — a no-op on a public page or before one has started. The shared fetch
 * helpers call this after any successful response, which is what makes ordinary API calls
 * count as activity, the same as the backend's own idle timer already does.
 */
export function noteServerActivity(): void {
  activeMonitor?.noteServerActivity()
}
