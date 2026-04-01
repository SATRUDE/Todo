import type { Meta, StoryObj } from '@storybook/react';
import { ActiveSessionAlert } from './ActiveSessionAlert';

const meta: Meta<typeof ActiveSessionAlert> = {
  title: 'Components/ActiveSessionAlert',
  component: ActiveSessionAlert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ActiveSessionAlert>;

export const Default: Story = {
  args: {
    sessionName: 'Morning Focus',
    sessionColor: '#8B5CF6',
    onGoToSession: () => console.log('Navigate to session'),
    onDismiss: () => console.log('Dismiss alert'),
  },
};

export const LongName: Story = {
  args: {
    sessionName: 'Very Long Session Name That Should Truncate Properly',
    sessionColor: '#0B64F9',
    onGoToSession: () => console.log('Navigate to session'),
    onDismiss: () => console.log('Dismiss alert'),
  },
};

export const DifferentColors: Story = {
  args: {
    sessionName: 'Design Review',
    sessionColor: '#00C853',
    onGoToSession: () => console.log('Navigate to session'),
    onDismiss: () => console.log('Dismiss alert'),
  },
};
