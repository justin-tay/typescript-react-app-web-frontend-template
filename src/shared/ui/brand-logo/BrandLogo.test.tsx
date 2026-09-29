import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLogo } from './BrandLogo'
import { LogoMark } from './LogoMark'

describe('BrandLogo', () => {
  it('writes the name as text and keeps the drawing out of the accessibility tree', () => {
    const { container } = render(<BrandLogo name="MyService" />)

    expect(screen.getByText('MyService')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('LogoMark', () => {
  it('has an accessible name only when given a title', () => {
    const { rerender } = render(<LogoMark />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    rerender(<LogoMark title="MyService" />)
    expect(screen.getByRole('img', { name: 'MyService' })).toBeInTheDocument()
  })

  it('contains no text, so it can be used without the name', () => {
    const { container } = render(<LogoMark title="MyService" />)

    expect(container.querySelector('text')).toBeNull()
  })

  it('is mirror-symmetric: the two heads sit equally far from the centre line', () => {
    const { container } = render(<LogoMark />)
    const [left, right] = [...container.querySelectorAll('circle')].map((c) => Number(c.getAttribute('cx')))

    expect(32 - left).toBe(right - 32)
  })
})
