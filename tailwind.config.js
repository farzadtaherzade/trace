const tokens = require('./src/constants/design-tokens.json');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: tokens.colors.background,
        card: tokens.colors.card,
        border: tokens.colors.border,
        text: tokens.colors.text,
        'text-dim': tokens.colors.textDim,
        accent: tokens.colors.accent,
        'accent-dim': tokens.colors.accentDim,
        danger: tokens.colors.danger,
      },
      borderRadius: {
        control: `${tokens.radii.control}px`,
        card: `${tokens.radii.card}px`,
        pill: `${tokens.radii.pill}px`,
      },
      spacing: {
        gutter: `${tokens.spacing.gutter}px`,
        card: `${tokens.spacing.card}px`,
        section: `${tokens.spacing.section}px`,
      },
      fontFamily: {
        sans: ['System', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
