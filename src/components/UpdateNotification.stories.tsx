import type { Meta, StoryObj } from '@storybook/react';
import { UpdateNotification } from './UpdateNotification';

const meta: Meta<typeof UpdateNotification> = {
  title: 'Components/UpdateNotification',
  component: UpdateNotification,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof UpdateNotification>;

export const Default: Story = {
  args: {
    onReload: () => {},
    onDismiss: () => {},
  },
};
export const ReloadOnly: Story = {
  args: {
    onReload: () => {},
  },
};
