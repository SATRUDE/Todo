import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AddFolderModal } from './AddFolderModal';
import { Button } from './ui/button';

const meta: Meta<typeof AddFolderModal> = {
  title: 'Components/AddFolderModal',
  component: AddFolderModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AddFolderModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Add Folder</Button>
        <AddFolderModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onAddFolder={(name) => console.log('Add folder', name)}
        />
      </>
    );
  },
};
