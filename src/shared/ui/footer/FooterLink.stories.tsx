import type { Meta, StoryObj } from '@storybook/react-vite'
import { FooterLink } from './FooterLink'

const meta = {
  title: 'Shared/FooterLink',
  component: FooterLink,
  args: { label: 'Privacy Statement', href: '#' },
} satisfies Meta<typeof FooterLink>

export default meta
type Story = StoryObj<typeof meta>

export const Internal: Story = {}

/** A link to another site: the icon, a new tab, and a hidden note for screen readers. */
export const External: Story = { args: { label: 'Report Vulnerability', external: true } }
