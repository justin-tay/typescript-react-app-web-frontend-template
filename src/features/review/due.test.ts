import { describe, expect, it } from 'vitest'
import { dueHint } from './due'

const today = new Date('2026-10-07T15:30:00Z')
const open = (dueDate: string, overdue = false) => ({ status: 'open' as const, dueDate, overdue })

describe('dueHint', () => {
  it('counts the days to a later due date', () => {
    expect(dueHint(open('2026-10-31'), today)).toEqual({ text: 'in 24 days', tone: 'later' })
  })

  it('calls a due date within a week soon, and says "day" for one', () => {
    expect(dueHint(open('2026-10-14'), today)).toEqual({ text: 'in 7 days', tone: 'soon' })
    expect(dueHint(open('2026-10-08'), today)).toEqual({ text: 'in 1 day', tone: 'soon' })
  })

  it('says when it is due today', () => {
    expect(dueHint(open('2026-10-07'), today)).toEqual({ text: 'due today', tone: 'soon' })
  })

  it('counts the days overdue', () => {
    expect(dueHint(open('2026-10-04', true), today)).toEqual({ text: '3 days overdue', tone: 'overdue' })
  })

  it('has nothing to say about a completed review', () => {
    expect(dueHint({ status: 'completed', dueDate: '2026-10-01', overdue: false }, today)).toBeNull()
  })
})
