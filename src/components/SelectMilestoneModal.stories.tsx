import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SelectMilestoneModal } from './SelectMilestoneModal';
import { Button } from './ui/button';

const mockMilestones = [
  { id: 1, name: 'Phase 1', goalId: 1, goalName: 'Product Launch' },
  { id: 2, name: 'Phase 2', goalId: 1, goalName: 'Product Launch' },
  { id: 3, name: 'Research', goalId: 2, goalName: 'Q2 Goals' },
];

const meta: Meta<typeof SelectMilestoneModal> = {
  title: 'Components/SelectMilestoneModal',
  component: SelectMilestoneModal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SelectMilestoneModal>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(1);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Select Milestone</Button>
        <SelectMilestoneModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          milestones={mockMilestones}
          selectedMilestoneId={selectedId}
          onSelectMilestone={(id) => setSelectedId(id)}
        />
      </>
    );
  },
};
