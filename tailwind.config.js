/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          'oklch(0.672 0.210 48)',
        'primary-dark':   'oklch(0.590 0.208 44)',
        'primary-light':  'oklch(0.155 0.045 48)',
        'sidebar-bg':     'oklch(0.068 0.008 238)',
        accent:           'oklch(0.645 0.145 230)',
        'accent-light':   'oklch(0.155 0.038 230)',
        secondary:        'oklch(0.700 0.120 198)',
        success:          'oklch(0.715 0.195 152)',
        warning:          'oklch(0.745 0.155 72)',
        danger:           'oklch(0.545 0.218 27)',
        background:       'oklch(0.095 0.006 238)',
        surface:          'oklch(0.128 0.007 238)',
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
