import { Badge, Button } from '@opengovsg/oui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageHeader } from './PageHeader'

const meta = {
  title: 'Shared/PageHeader',
  component: PageHeader,
  args: { title: 'Users', subtitle: 'Manage users and their group memberships.' },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { actions: <Button>New user</Button> } }

export const DetailPage: Story = {
  args: {
    title: 'Grace Hopper',
    subtitle: 'grace',
    badge: <Badge color="warning">Pending</Badge>,
    backLink: { href: '#', label: 'Back to users' },
    actions: <Button variant="outline">Edit</Button>,
  },
}
