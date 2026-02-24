import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AddListOrFolderModal } from './AddListOrFolderModal';
import { Button } from './ui/button';

const meta: Meta<typeof AddListOrFolderModal> = {
  title: 'Components/AddListOrFolderModal',
  component: AddListOrFolderModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AddListOrFolderModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Add</Button>
        <AddListOrFolderModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAddList={() => console.log('Add list')}
          onAddFolder={() => console.log('Add folder')}
        />
      </>
    );
  },
};
