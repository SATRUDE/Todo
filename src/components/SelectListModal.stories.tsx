import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SelectListModal } from './SelectListModal';
import { Button } from './ui/button';

const mockLists = [
  { id: 1, name: 'Work', color: '#0B64F9', count: 5, isShared: false },
  { id: 2, name: 'Personal', color: '#00C853', count: 3, isShared: false },
  { id: 3, name: 'Shopping', color: '#FF6D00', count: 2, isShared: false },
];

const meta: Meta<typeof SelectListModal> = {
  title: 'Components/SelectListModal',
  component: SelectListModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SelectListModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(1);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Select List</Button>
        <SelectListModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          lists={mockLists}
          selectedListId={selectedId}
          onSelectList={(id) => setSelectedId(id)}
        />
      </>
    );
  },
};
export const WithToday: Story = {
  render: function WithTodayStory() {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(0);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Select List</Button>
        <SelectListModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          lists={mockLists}
          selectedListId={selectedId}
          onSelectList={(id) => setSelectedId(id)}
          includeToday
        />
      </>
    );
  },
};
