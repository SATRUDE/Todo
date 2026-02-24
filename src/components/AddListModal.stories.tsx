import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AddListModal } from './AddListModal';
import { Button } from './ui/button';

const meta: Meta<typeof AddListModal> = {
  title: 'Components/AddListModal',
  component: AddListModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AddListModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Add List</Button>
        <AddListModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAddList={(name) => console.log('Add list', name)}
        />
      </>
    );
  },
};
export const WithFolders: Story = {
  render: function WithFoldersStory() {
    const [isOpen, setIsOpen] = useState(true);
    const folders = [
      { id: 1, name: 'Work', sort_order: 0 },
      { id: 2, name: 'Personal', sort_order: 1 },
    ];
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Add List</Button>
        <AddListModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAddList={(name) => console.log('Add list', name)}
          folders={folders}
        />
      </>
    );
  },
};
