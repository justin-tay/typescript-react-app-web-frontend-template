import type { Meta, StoryObj } from '@storybook/react-vite'
import { Masthead } from './Masthead'

const meta = {
  title: 'Shared/Masthead',
  component: Masthead,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Masthead>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Expanded: Story = { args: { defaultExpanded: true } }

export const WithEnvironment: Story = { args: { environment: 'staging' } }

export const Fluid: Story = { args: { fluid: true, defaultExpanded: true } }
