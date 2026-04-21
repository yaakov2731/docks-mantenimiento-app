/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          'oklch(0.65 0.135 70)',
        'primary-dark':   'oklch(0.54 0.120 68)',
        'primary-light':  'oklch(0.95 0.040 72)',
        'sidebar-bg':     'oklch(0.14 0.018 52)',
        accent:           'oklch(0.52 0.115 158)',
        'accent-light':   'oklch(0.94 0.038 158)',
        secondary:        'oklch(0.55 0.10 280)',
        success:          'oklch(0.52 0.120 150)',
        warning:          'oklch(0.72 0.145 72)',
        danger:           'oklch(0.50 0.175 25)',
        background:       'oklch(0.974 0.007 68)',
        surface:          'oklch(0.997 0.003 68)',
      },
      fontFamily: {
        heading: ['Barlow', 'sans-serif'],
        body:    ['Noto Sans', 'sans-serif'],
        sans:    ['Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
