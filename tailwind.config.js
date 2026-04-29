/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          'oklch(0.578 0.195 56)',
        'primary-dark':   'oklch(0.512 0.192 52)',
        'primary-light':  'oklch(0.952 0.038 65)',
        'sidebar-bg':     'oklch(0.195 0.012 50)',
        accent:           'oklch(0.548 0.100 220)',
        'accent-light':   'oklch(0.944 0.026 220)',
        secondary:        'oklch(0.540 0.085 165)',
        success:          'oklch(0.548 0.188 148)',
        warning:          'oklch(0.618 0.165 76)',
        danger:           'oklch(0.535 0.218 26)',
        background:       'oklch(0.952 0.006 62)',
        surface:          'oklch(0.990 0.003 60)',
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
