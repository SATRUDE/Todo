import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TaskTypeModal } from './TaskTypeModal';
import { Button } from './ui/button';

const meta: Meta<typeof TaskTypeModal> = {
  title: 'Components/TaskTypeModal',
  component: TaskTypeModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TaskTypeModal>;

export const Task: Story = {
  render: function TaskStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Change Type</Button>
        <TaskTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentType="task"
          onSelectType={(type) => console.log('Selected type', type)}
        />
      </>
    );
  },
};
export const Reminder: Story = {
  render: function ReminderStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Change Type</Button>
        <TaskTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentType="reminder"
          onSelectType={(type) => console.log('Selected type', type)}
        />
      </>
    );
  },
};
