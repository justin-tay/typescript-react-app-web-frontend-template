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
 * assumes the session is over and tells the caller (see `onExpired`), which signs out. It
 * deliberately does not ask the server first: any authenticated request would itself count as
 * activity and could extend a session the person never chose to keep. The configured idle
 * timeout is set a little shorter than the backend's so this fires first. An absolute-timeout
 * expiry is discovered by the next request that fails (see `session-broadcast.ts`).
 */

const CHANNEL_NAME = 'app:session-timeout'
const HEARTBEAT_LOCK_NAME = 'app:session-heartbeat'
/** How often at most a tab tells the others the user is active; the mouse moves far faster. */
const USER_ACTIVITY_BROADCAST_INTERVAL_MS = 2_000
/**
 * How long a tab that lost the heartbeat lock waits for the winner's result before it prompts
 * after all, so a request that never completes cannot leave the tab silent until it expires.
 */
const HEARTBEAT_GRACE_MS = 3_000

/** `activity`: the server session was just extended. `user-active`: the user just used some tab. */
interface ActivityMessage {
  type: 'activity' | 'user-active'
  at: number
}

export interface SessionTimeoutOptions {
  /** How long the backend allows a session to sit idle; mirror its own configured value. */
  idleTimeoutMs: number
  /** How long before the deadline to prompt, if there has been no recent local activity. */
  promptBeforeMs: number
  /** How recently the user must have moved the mouse/pressed a key, in any tab, to auto-extend silently. */
  recentLocalActivityWindowMs?: number
  /** Makes a request that resets the backend's idle timer, e.g. re-fetching `/login-user`. */
  extend: () => Promise<void>
  /** Called whenever the prompt should show or hide, with the time left when showing. */
  onPromptChange: (isPrompted: boolean, remainingMs: number) => void
  /** The local countdown reached zero with no extension; the caller ends the session. */
  onExpired: () => void
}

const DEFAULT_RECENT_ACTIVITY_WINDOW_MS = 30_000

export class SessionTimeoutMonitor {
  private readonly options: Required<SessionTimeoutOptions>
  private readonly channel = new BroadcastChannel(CHANNEL_NAME)
  private lastServerActivityAt = Date.now()
  /** The user's latest activity in any tab, learned from their broadcasts and this tab's own events. */
  private lastUserActivityAt = 0
  private lastUserActivityBroadcastAt = 0
  private promptTimer: ReturnType<typeof setTimeout> | null = null
  private graceTimer: ReturnType<typeof setTimeout> | null = null
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

  /**
   * The extension after recent activity. Every tab reaches this at the same moment, so a lock
   * lets exactly one of them make the request; the others skip, and learn the result from the
   * `activity` broadcast that follows. Without Web Locks every tab makes its own request.
   */
  private async extendSilently(deadline: number): Promise<void> {
    if (!navigator.locks) return this.extendNow()
    const extended = await navigator.locks.request(HEARTBEAT_LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) return false
      await this.extendNow()
      return true
    })
    if (extended) return
    // Another tab is on it. If its result does not arrive (every move of the deadline clears
    // this timer), prompt rather than wait silently.
    this.graceTimer = setTimeout(() => this.promptNow(deadline), HEARTBEAT_GRACE_MS)
  }

  private handleLocalActivity(): void {
    const now = Date.now()
    this.lastUserActivityAt = now
    if (now - this.lastUserActivityBroadcastAt >= USER_ACTIVITY_BROADCAST_INTERVAL_MS) {
      this.lastUserActivityBroadcastAt = now
      // So a tab nobody is looking at does not warn them while another one is in use.
      this.channel.postMessage({ type: 'user-active', at: now } satisfies ActivityMessage)
    }
  }

  private handleMessage(event: MessageEvent<ActivityMessage>): void {
    if (event.data?.type === 'activity') this.applyServerActivity(event.data.at)
    else if (event.data?.type === 'user-active') {
      this.lastUserActivityAt = Math.max(this.lastUserActivityAt, event.data.at)
    }
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
    const hasRecentLocalActivity = Date.now() - this.lastUserActivityAt < this.options.recentLocalActivityWindowMs
    if (hasRecentLocalActivity) {
      // "Defer the firing": local activity alone never talks to the server on every
      // event; only at the moment a prompt would otherwise be needed is it consulted, to
      // decide a silent extension instead of bothering someone who is plainly still here.
      // If the silent extension itself fails (the session may already be gone), fall back
      // to the prompt rather than staying silent about it.
      this.extendSilently(deadline).catch(() => this.promptNow(deadline))
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
    if (this.graceTimer) clearTimeout(this.graceTimer)
    this.graceTimer = null
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
