import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { StatCard } from './StatCard'

const meta = {
  title: 'Shared/StatCard',
  component: StatCard,
  args: { label: 'Total users', value: 248 },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Pressable: Story = { args: { onPress: fn() } }

export const Loading: Story = { args: { value: 'loading' } }

export const Unavailable: Story = { args: { value: 'unavailable' } }
