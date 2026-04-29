/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          'oklch(0.775 0.175 68)',
        'primary-dark':   'oklch(0.700 0.172 64)',
        'primary-light':  'oklch(0.150 0.040 68)',
        'sidebar-bg':     'oklch(0.060 0.010 48)',
        accent:           'oklch(0.640 0.095 195)',
        'accent-light':   'oklch(0.150 0.028 195)',
        secondary:        'oklch(0.655 0.075 170)',
        success:          'oklch(0.720 0.190 148)',
        warning:          'oklch(0.760 0.165 78)',
        danger:           'oklch(0.552 0.215 26)',
        background:       'oklch(0.092 0.008 52)',
        surface:          'oklch(0.122 0.009 52)',
      },
      fontFamily: {
        heading: ['"IBM Plex Mono"', 'monospace'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
        sans:    ['"IBM Plex Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm:      '2px',
        DEFAULT: '3px',
        md:      '3px',
        lg:      '4px',
        xl:      '6px',
        '2xl':   '8px',
        full:    '9999px',
      },
    },
  },
  plugins: [],
}
