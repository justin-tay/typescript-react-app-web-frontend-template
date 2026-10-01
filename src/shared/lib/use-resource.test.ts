import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useResource } from './use-resource'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useResource', () => {
  it('starts loading, then holds what the fetcher returned', async () => {
    const fetcher = vi.fn().mockResolvedValue('Ada')
    const { result } = renderHook(() => useResource(fetcher, ['u1']))

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current).toMatchObject({ status: 'loaded', data: 'Ada' }))
    expect(fetcher).toHaveBeenCalledWith('u1')
  })

  it('holds the error when the fetcher fails, and wraps a rejection that is not an Error', async () => {
    const { result } = renderHook(() => useResource(vi.fn().mockRejectedValue('nope'), []))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current).toMatchObject({ error: new Error('nope') })
  })

  it('reloads without going back to loading, so what is on screen stays until the new data arrives', async () => {
    const second = deferred<string>()
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useResource(fetcher, []))
    await waitFor(() => expect(result.current).toMatchObject({ data: 'first' }))

    act(() => result.current.reload())

    expect(result.current).toMatchObject({ status: 'loaded', data: 'first' })
    await act(async () => second.resolve('second'))
    expect(result.current).toMatchObject({ status: 'loaded', data: 'second' })
  })

  it('goes back to loading when the arguments change, since the data shown is for something else', async () => {
    const next = deferred<string>()
    const fetcher = vi.fn().mockResolvedValueOnce('user one').mockReturnValueOnce(next.promise)
    const { result, rerender } = renderHook(({ id }) => useResource(fetcher, [id]), { initialProps: { id: 'u1' } })
    await waitFor(() => expect(result.current).toMatchObject({ data: 'user one' }))

    rerender({ id: 'u2' })

    expect(result.current.status).toBe('loading')
    expect(fetcher).toHaveBeenLastCalledWith('u2')
    await act(async () => next.resolve('user two'))
    expect(result.current).toMatchObject({ data: 'user two' })
  })

  it('does not fetch again for a new array holding the same arguments', async () => {
    const fetcher = vi.fn().mockResolvedValue('x')
    const { rerender } = renderHook(() => useResource(fetcher, ['same']))
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

    rerender()
    rerender()

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('ignores an old answer that arrives after the arguments changed', async () => {
    const slow = deferred<string>()
    const fetcher = vi.fn().mockReturnValueOnce(slow.promise).mockResolvedValueOnce('user two')
    const { result, rerender } = renderHook(({ id }) => useResource(fetcher, [id]), { initialProps: { id: 'u1' } })

    rerender({ id: 'u2' })
    await waitFor(() => expect(result.current).toMatchObject({ data: 'user two' }))
    await act(async () => slow.resolve('user one'))

    expect(result.current).toMatchObject({ data: 'user two' })
  })

  it('fetches nothing while disabled, and starts when enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue('x')
    const { result, rerender } = renderHook(({ enabled }) => useResource(fetcher, [], { enabled }), {
      initialProps: { enabled: false },
    })

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.status).toBe('loading')

    rerender({ enabled: true })
    await waitFor(() => expect(result.current).toMatchObject({ data: 'x' }))
  })

  it('refetches quietly when a refreshOn value changes, keeping the data on screen', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new')
    const { result, rerender } = renderHook(({ key }) => useResource(fetcher, [], { refreshOn: [key] }), {
      initialProps: { key: 'a' },
    })
    await waitFor(() => expect(result.current).toMatchObject({ data: 'old' }))

    rerender({ key: 'b' })

    expect(result.current).toMatchObject({ status: 'loaded', data: 'old' })
    await waitFor(() => expect(result.current).toMatchObject({ data: 'new' }))
  })
})
