import type { Meta, StoryObj } from '@storybook/react';
import { ReviewMissedDeadlinesBox } from './ReviewMissedDeadlinesBox';

const meta: Meta<typeof ReviewMissedDeadlinesBox> = {
  title: 'Components/ReviewMissedDeadlinesBox',
  component: ReviewMissedDeadlinesBox,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ReviewMissedDeadlinesBox>;

export const Default: Story = {
  args: { onClick: () => {}, missedCount: 3 },
};
export const NoCount: Story = {
  args: { onClick: () => {} },
};
export const ManyOverdue: Story = {
  args: { onClick: () => {}, missedCount: 12 },
};
