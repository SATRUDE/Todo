import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = { args: { placeholder: 'Type your message here.' } };
export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-full gap-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Type your message here." {...args} />
    </div>
  ),
};
export const Disabled: Story = { args: { disabled: true, placeholder: 'Disabled' } };
