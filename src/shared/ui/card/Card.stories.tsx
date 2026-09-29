import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from './Card'

const meta = {
  title: 'Shared/Card',
  component: Card,
  args: { title: 'Contact information', children: <p>Any content goes here.</p>, className: 'max-w-md' },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutTitle: Story = { args: { title: undefined } }
