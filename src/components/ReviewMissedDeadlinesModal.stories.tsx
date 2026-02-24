import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ReviewMissedDeadlinesModal } from './ReviewMissedDeadlinesModal';
import { Button } from './ui/button';

const mockLists = [
  { id: 1, name: 'Work', color: '#0B64F9', count: 5, isShared: false },
  { id: 2, name: 'Personal', color: '#00C853', count: 3, isShared: false },
];
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const mockMissedDeadlines = [
  {
    id: 1,
    text: 'Review project proposal',
    completed: false,
    listId: 1,
    deadline: { date: yesterday, time: '14:00' },
  },
  {
    id: 2,
    text: 'Call client',
    completed: false,
    listId: 2,
    deadline: { date: yesterday, time: '09:30' },
  },
];

const meta: Meta<typeof ReviewMissedDeadlinesModal> = {
  title: 'Components/ReviewMissedDeadlinesModal',
  component: ReviewMissedDeadlinesModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ReviewMissedDeadlinesModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Review Overdue</Button>
        <ReviewMissedDeadlinesModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          missedDeadlines={mockMissedDeadlines}
          lists={mockLists}
          onToggleTask={(id) => console.log('Toggle', id)}
          onUpdateDeadline={(id, d) => console.log('Update deadline', id, d)}
          onDeleteTask={(id) => console.log('Delete', id)}
        />
      </>
    );
  },
};
