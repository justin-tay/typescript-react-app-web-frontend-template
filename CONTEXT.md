# Web frontend

The single-page app people use to sign in, manage their own account, review accounts, and administer users and roles. This file holds the project's domain language; see `docs/system-design/12-glossary.md` for the wider glossary.

## Language

**Session end**:
The moment a signed-in person's session stops being valid, for any reason. Every open tab then shows the sign-in card where it is, and nothing belonging to the previous person is kept.
_Avoid_: Logout (that is only one way a session ends), session drop

**Signed out**:
A session end the person chose, by leaving on purpose from this tab or another.
_Avoid_: Logged out

**Expired**:
Any session end the person did not choose: idle timeout, absolute timeout, an admin revoking the session, or the server finding the session gone. The sign-in card says so.
_Avoid_: Timed out, dropped, kicked out

**Previous person's traces**:
What the app remembers about someone while they are signed in (saved list searches, filters, sort and page), which a session end forgets so the next person to sign in does not inherit it.
_Avoid_: Leftover state, stale state
