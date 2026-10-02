import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Masthead } from './Masthead'

const region = () => screen.getByRole('region', { name: /official website banner/i })
const toggle = () => screen.getByRole('button', { name: 'How to identify' })
const panel = (container: HTMLElement) => container.querySelector(`[id="${toggle().getAttribute('aria-controls')}"]`)

describe('Masthead', () => {
  it('shows the banner text with the panel closed', () => {
    const { container } = render(<Masthead />)

    expect(screen.getByText('A Singapore Government Agency Website')).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    // The closed panel is inert, so its link is neither reachable nor announced.
    expect(panel(container)).toHaveAttribute('inert')
  })

  it('opens and closes the panel from the button', async () => {
    const { container } = render(<Masthead />)

    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(panel(container)).not.toHaveAttribute('inert')
    expect(screen.getByRole('link', { name: 'Trusted websites' })).toHaveAttribute(
      'href',
      'https://www.gov.sg/trusted-sites#govsites',
    )
    expect(screen.getByText('Secure websites use HTTPS')).toBeInTheDocument()

    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(panel(container)).toHaveAttribute('inert')
  })

  it('toggles from the keyboard', async () => {
    render(<Masthead />)

    await userEvent.tab()
    expect(toggle()).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard(' ')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('starts open when defaultExpanded is set', () => {
    render(<Masthead defaultExpanded />)

    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Trusted websites' })).toBeInTheDocument()
  })

  it('points the button at the panel it controls', () => {
    const { container } = render(<Masthead defaultExpanded />)

    expect(panel(container)).toContainElement(screen.getByRole('link', { name: 'Trusted websites' }))
  })

  it('names the environment only when one is given', () => {
    const { rerender } = render(<Masthead />)
    expect(screen.queryByText(/NOTE: THIS IS A/)).not.toBeInTheDocument()

    rerender(<Masthead environment="staging" />)
    expect(screen.getByText('[NOTE: THIS IS A STAGING WEBSITE]')).toBeInTheDocument()

    rerender(<Masthead environment="qa" />)
    expect(screen.getByText('[NOTE: THIS IS A QA WEBSITE]')).toBeInTheDocument()
  })

  it('limits the width unless fluid', () => {
    const { container, rerender } = render(<Masthead />)
    expect(container.querySelector('.max-w-\\[1440px\\]')).toBeInTheDocument()

    rerender(<Masthead fluid />)
    expect(container.querySelector('.max-w-\\[1440px\\]')).not.toBeInTheDocument()
  })

  it('adds the classNames to the wrapper and the bar', () => {
    const { container } = render(
      <Masthead classNames={{ banner: 'custom-banner', mainContentContainer: 'custom-bar' }} />,
    )

    expect(region()).toHaveClass('custom-banner')
    expect(container.querySelector('.custom-bar')).toContainElement(toggle())
  })
})
