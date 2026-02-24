import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AddTaskModal } from './AddTaskModal';
import { Button } from './ui/button';

const mockLists = [
  { id: 1, name: 'Work', color: '#0B64F9', count: 5, isShared: false },
  { id: 2, name: 'Personal', color: '#00C853', count: 3, isShared: false },
];
const mockMilestones = [
  { id: 1, name: 'Q1 Goals', goalId: 1, goalName: 'Product Launch' },
];

const meta: Meta<typeof AddTaskModal> = {
  title: 'Components/AddTaskModal',
  component: AddTaskModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AddTaskModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Add Task</Button>
        <AddTaskModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAddTask={(text, desc, listId) => console.log('Add task', text, desc, listId)}
          lists={mockLists}
          milestones={mockMilestones}
        />
      </>
    );
  },
};
