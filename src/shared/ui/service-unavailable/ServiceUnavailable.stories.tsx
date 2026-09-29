import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ServiceUnavailable } from './ServiceUnavailable'

const meta = {
  title: 'Shared/ServiceUnavailable',
  component: ServiceUnavailable,
  args: { kind: 'unavailable', onRetry: fn(), className: 'max-w-xl' },
} satisfies Meta<typeof ServiceUnavailable>

export default meta
type Story = StoryObj<typeof meta>

export const Unavailable: Story = {}

export const Failed: Story = { args: { kind: 'failed' } }

export const FullWidthButton: Story = { args: { fullWidthButton: true, className: 'max-w-sm' } }
