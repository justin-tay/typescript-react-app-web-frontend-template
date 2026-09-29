import { describe, expect, it } from 'vitest'
import { greeting } from './greeting'

const at = (hour: number) => greeting(new Date(2026, 0, 1, hour, 30))

describe('greeting', () => {
  it('says morning from 5am until noon', () => {
    expect([at(5), at(11)]).toEqual(['Good morning', 'Good morning'])
  })

  it('says afternoon from noon until 5pm', () => {
    expect([at(12), at(16)]).toEqual(['Good afternoon', 'Good afternoon'])
  })

  it('says evening from 5pm, and still evening late at night', () => {
    expect([at(17), at(23), at(0), at(4)]).toEqual(['Good evening', 'Good evening', 'Good evening', 'Good evening'])
  })
})
