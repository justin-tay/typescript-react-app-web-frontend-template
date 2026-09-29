import type { Meta, StoryObj } from '@storybook/react-vite'
import { BrandLogo } from './BrandLogo'
import { LogoMark } from './LogoMark'

const meta = {
  title: 'Shared/BrandLogo',
  component: BrandLogo,
  args: { name: 'MyService' },
} satisfies Meta<typeof BrandLogo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: 'sm' } }

export const Large: Story = { args: { size: 'lg' } }

/** The mark alone, for a favicon or an avatar. It has no text. */
export const MarkOnly: Story = { render: () => <LogoMark size={64} title="MyService" /> }

/** On a dark background the two logo colours are set to white. */
export const OnDark: Story = {
  render: () => (
    <div
      className="rounded-lg bg-indigo-900 p-6 text-white"
      style={{ '--logo-primary': 'white', '--logo-accent': 'rgb(255 255 255 / 0.75)' } as React.CSSProperties}
    >
      <BrandLogo name="MyService" size="lg" />
    </div>
  ),
}
