import type { Meta, StoryObj } from '@storybook/react-vite'
import { Footer } from './Footer'

const meta = {
  title: 'Shared/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  args: {
    appName: 'MyService',
    copyrightHolder: 'Your Organisation',
    links: [
      { label: 'Contact', href: '#' },
      { label: 'Feedback', href: '#' },
      { label: 'Report Vulnerability', href: '#' },
      { label: 'Privacy Statement', href: '#' },
      { label: 'Terms of Use', href: '#' },
    ],
  },
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const FewLinks: Story = {
  args: {
    links: [
      { label: 'Privacy Statement', href: '#' },
      { label: 'Terms of Use', href: '#' },
    ],
  },
}
