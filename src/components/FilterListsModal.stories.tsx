import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FilterListsModal } from './FilterListsModal';
import { Button } from './ui/button';

const mockLists = [
  { id: 1, name: 'Work', color: '#0B64F9', count: 5, isShared: false },
  { id: 2, name: 'Personal', color: '#00C853', count: 3, isShared: false },
  { id: 3, name: 'Shopping', color: '#FF6D00', count: 2, isShared: false },
];
const mockFolders = [
  { id: 1, name: 'Work', sort_order: 0 },
  { id: 2, name: 'Personal', sort_order: 1 },
];

const meta: Meta<typeof FilterListsModal> = {
  title: 'Components/FilterListsModal',
  component: FilterListsModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FilterListsModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set([1, 2]));
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Filter Lists</Button>
        <FilterListsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          lists={mockLists}
          folders={mockFolders}
          selectedListIds={selectedIds}
          onApplyFilter={(ids) => setSelectedIds(ids)}
        />
      </>
    );
  },
};
