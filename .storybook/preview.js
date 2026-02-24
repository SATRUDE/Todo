import '../src/index.css';
import React from 'react';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (Story, context) => {
      const theme = context.globals?.theme ?? 'dark';
      return React.createElement(
        'div',
        {
          className: `bg-background text-foreground ${theme === 'dark' ? 'dark' : ''}`,
          style: { minHeight: '100vh', width: '100%', padding: '1rem', background: 'var(--background)' },
        },
        React.createElement(Story)
      );
    },
  ],
  globalTypes: {
    theme: {
      description: 'Toggle light or dark mode for all components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo"
    }
  },
};

export default preview;