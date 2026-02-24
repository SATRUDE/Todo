import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DeadlineModal } from './DeadlineModal';
import { Button } from './ui/button';

const meta: Meta<typeof DeadlineModal> = {
  title: 'Components/DeadlineModal',
  component: DeadlineModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DeadlineModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Set Deadline</Button>
        <DeadlineModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSetDeadline={(date, time) => console.log('Set deadline', date, time)}
          onClearDeadline={() => console.log('Clear deadline')}
        />
      </>
    );
  },
};
export const WithExistingDeadline: Story = {
  render: function WithExistingStory() {
    const [isOpen, setIsOpen] = useState(true);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Edit Deadline</Button>
        <DeadlineModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSetDeadline={(date, time) => console.log('Set deadline', date, time)}
          onClearDeadline={() => console.log('Clear deadline')}
          currentDeadline={{ date: tomorrow, time: '14:00' }}
        />
      </>
    );
  },
};
