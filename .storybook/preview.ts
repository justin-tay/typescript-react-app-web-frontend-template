import type { Preview } from '@storybook/react-vite'
import '../src/index.css'

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    a11y: { test: 'error' },
  },
}

export default preview
