import { describe, expect, it } from 'vitest'
import { reviewCrumb, reviewHref, standing } from './parts'
import { category, task } from './test-helpers'

const confirmed = { confirmed: true, confirmedBy: 'rev1', count: 3 }

describe('standing', () => {
  it('lists the three parts in order, each with its address under the review', () => {
    const { parts } = standing(task({ id: 'a/b' }))
    expect(parts.map((part) => [part.key, part.kind, part.title, part.href])).toEqual([
      ['active', 'category', 'Active accounts', '/admin/reviews/a%2Fb/active'],
      ['suspended', 'category', 'Suspended accounts', '/admin/reviews/a%2Fb/suspended'],
      ['removed', 'population', 'Removed accounts', '/admin/reviews/a%2Fb/removed'],
    ])
  })

  it.each([
    ['nothing done', task({ active: category(1, 2), suspended: category(0, 1) }), [false, false, false], 2],
    ['active done', task({ active: category(2, 2), suspended: category(0, 1) }), [true, false, false], 1],
    [
      'a category with no accounts',
      task({ active: category(0, 0), suspended: category(0, 0) }),
      [true, true, false],
      0,
    ],
    ['removed confirmed', task({ active: category(0, 2), removed: confirmed }), [false, false, true], 3],
  ])('says which parts are done and how many accounts are left: %s', (_, t, done, left) => {
    const result = standing(t)
    expect(result.parts.map((part) => part.isDone)).toEqual(done)
    expect(result.doneCount).toBe(done.filter(Boolean).length)
    expect(result.isDone).toBe(false)
    expect(result.accountsLeft).toBe(left)
  })

  it('is done when every part is done', () => {
    const result = standing(task({ active: category(2, 2), suspended: category(1, 1), removed: confirmed }))
    expect(result.doneCount).toBe(3)
    expect(result.isDone).toBe(true)
    expect(result.accountsLeft).toBe(0)
  })

  it.each([
    ['nothing decided', task({ active: category(0, 2), suspended: category(0, 1) }), false, 'start'],
    ['an active account decided', task({ active: category(1, 2) }), true, 'continue'],
    ['a suspended account decided', task({ active: category(0, 2), suspended: category(1, 1) }), true, 'continue'],
    ['only the removed list confirmed', task({ active: category(0, 2), removed: confirmed }), true, 'continue'],
    ['completed', task({ status: 'completed', active: category(0, 0), suspended: category(0, 0) }), false, 'view'],
  ] as const)('says whether the review is started and what comes next: %s', (_, t, isStarted, next) => {
    expect(standing(t)).toMatchObject({ isStarted, next })
  })
})

describe('reviewHref', () => {
  it('addresses a review, or one of its parts', () => {
    expect(reviewHref('t1')).toBe('/admin/reviews/t1')
    expect(reviewHref('t1', 'suspended')).toBe('/admin/reviews/t1/suspended')
  })
})

describe('reviewCrumb', () => {
  it.each([
    ['/admin/reviews/t1', { taskHref: '/admin/reviews/t1' }],
    ['/admin/reviews/t1/active', { taskHref: '/admin/reviews/t1', partTitle: 'Active accounts' }],
    ['/admin/reviews/t1/removed', { taskHref: '/admin/reviews/t1', partTitle: 'Removed accounts' }],
    ['/admin/reviews', null],
    ['/admin/reviews/t1/elsewhere', null],
    ['/admin/reviews/t1/active/more', null],
    ['/admin/users/u1', null],
  ])('places %s', (pathname, crumb) => {
    expect(reviewCrumb(pathname)).toEqual(crumb)
  })
})
