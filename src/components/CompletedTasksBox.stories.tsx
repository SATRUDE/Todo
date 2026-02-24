import type { Meta, StoryObj } from '@storybook/react';
import { CompletedTasksBox } from './CompletedTasksBox';

const meta: Meta<typeof CompletedTasksBox> = {
  title: 'Components/CompletedTasksBox',
  component: CompletedTasksBox,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CompletedTasksBox>;

export const Default: Story = {
  args: {
    onClick: () => {},
    completedCount: 5,
  },
};
export const Empty: Story = {
  args: {
    onClick: () => {},
    completedCount: 0,
  },
};
