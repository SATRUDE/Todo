import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RadialTimePicker } from './RadialTimePicker';

const meta: Meta<typeof RadialTimePicker> = {
  title: 'Components/RadialTimePicker',
  component: RadialTimePicker,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadialTimePicker>;

export const Default: Story = {
  render: function DefaultStory() {
    const [time, setTime] = useState('09:30');
    return (
      <div className="w-[280px]">
        <RadialTimePicker selectedTime={time} onTimeChange={setTime} />
        <p className="text-sm text-muted-foreground mt-2 text-center">Selected: {time}</p>
      </div>
    );
  },
};
export const Evening: Story = {
  render: function EveningStory() {
    const [time, setTime] = useState('18:45');
    return (
      <div className="w-[280px]">
        <RadialTimePicker selectedTime={time} onTimeChange={setTime} />
      </div>
    );
  },
};
