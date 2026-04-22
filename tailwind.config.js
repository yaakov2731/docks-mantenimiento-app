/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          'oklch(0.725 0.148 68)',
        'primary-dark':   'oklch(0.640 0.152 65)',
        'primary-light':  'oklch(0.970 0.040 72)',
        'sidebar-bg':     'oklch(0.148 0.012 45)',
        accent:           'oklch(0.548 0.082 216)',
        'accent-light':   'oklch(0.948 0.028 216)',
        secondary:        'oklch(0.555 0.068 195)',
        success:          'oklch(0.530 0.130 150)',
        warning:          'oklch(0.720 0.150 72)',
        danger:           'oklch(0.520 0.185 25)',
        background:       'oklch(0.976 0.007 78)',
        surface:          'oklch(1.000 0.000 0)',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
