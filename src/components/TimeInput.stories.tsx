import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TimeInput } from './TimeInput';

const meta: Meta<typeof TimeInput> = {
  title: 'Components/TimeInput',
  component: TimeInput,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TimeInput>;

export const Default: Story = {};
export const WithLabel: Story = {
  args: { label: 'Time', value: '09:00' },
};
export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState('14:30');
    return <TimeInput value={value} onChange={setValue} label="Appointment time" />;
  },
};
export const Disabled: Story = {
  args: { disabled: true, value: '12:00' },
};
