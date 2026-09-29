import type { Meta, StoryObj } from '@storybook/react-vite'
import { DescriptionList } from './DescriptionList'

const meta = {
  title: 'Shared/DescriptionList',
  component: DescriptionList,
  args: {
    items: [
      { label: 'Username', value: 'grace' },
      { label: 'Email', value: 'grace@example.com' },
      { label: 'Last login', value: 'Never' },
    ],
  },
} satisfies Meta<typeof DescriptionList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
