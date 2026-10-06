import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConfirmModal } from './ConfirmModal'

const meta = {
  title: 'Shared/ConfirmModal',
  component: ConfirmModal,
  args: {
    isOpen: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: 'Delete role',
    description: 'This removes the role and every permission it grants. This cannot be undone.',
  },
} satisfies Meta<typeof ConfirmModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CustomLabel: Story = { args: { confirmLabel: 'Remove passkey' } }

export const Confirming: Story = { args: { isConfirming: true } }

export const WithError: Story = { args: { error: 'The role is still held by 3 users.' } }
