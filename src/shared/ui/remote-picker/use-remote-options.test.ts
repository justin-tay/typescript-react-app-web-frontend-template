import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { optionsNote, useRemoteOptions, type RemoteOptionsResult } from './use-remote-options'

const found = (names: string[], totalItems = names.length): RemoteOptionsResult => ({
  items: names.map((name) => ({ id: name.toLowerCase(), name })),
  totalItems,
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useRemoteOptions', () => {
  it('loads the first options straight away when nothing has been typed', async () => {
    const searchOptions = vi.fn().mockResolvedValue(found(['Admins']))
    const { result } = renderHook(() => useRemoteOptions(searchOptions, ''))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(searchOptions).toHaveBeenCalledWith({ search: '', size: 20 })
    expect(result.current.options).toEqual([{ id: 'admins', name: 'Admins' }])
  })

  it('waits for typing to pause before searching, and searches only for the last text', async () => {
    const searchOptions = vi.fn().mockResolvedValue(found([]))
    const { rerender } = renderHook(({ text }) => useRemoteOptions(searchOptions, text), {
      initialProps: { text: '' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    searchOptions.mockClear()

    rerender({ text: 'a' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    rerender({ text: 'ad' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(searchOptions).toHaveBeenCalledTimes(1)
    expect(searchOptions).toHaveBeenCalledWith({ search: 'ad', size: 20 })
  })

  it('reports the total so the picker can say there are more matches', async () => {
    const searchOptions = vi.fn().mockResolvedValue(found(['A', 'B'], 134))
    const { result } = renderHook(() => useRemoteOptions(searchOptions, ''))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.totalItems).toBe(134)
  })

  it('shows no options when the search fails', async () => {
    const searchOptions = vi.fn().mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useRemoteOptions(searchOptions, ''))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.options).toEqual([])
    expect(result.current.failed).toBe(true)
  })

  it('clears the failure once a later search succeeds', async () => {
    const searchOptions = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(found(['Admins']))
    const { result, rerender } = renderHook(({ text }) => useRemoteOptions(searchOptions, text), {
      initialProps: { text: '' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.failed).toBe(true)

    rerender({ text: 'ad' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.failed).toBe(false)
  })
})

describe('optionsNote', () => {
  it('asks the person to keep typing only when there are more matches than shown', () => {
    expect(optionsNote(20, 134)).toBe('Showing 20 of 134. Keep typing to narrow the list.')
    expect(optionsNote(20, 20)).toBeUndefined()
    expect(optionsNote(0, 0)).toBeUndefined()
  })

  it('says the options could not be loaded, whatever else is true', () => {
    expect(optionsNote(0, 0, true)).toBe('Could not load the options. Try again later.')
  })
})
