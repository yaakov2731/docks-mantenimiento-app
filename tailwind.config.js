/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          'oklch(0.748 0.162 70)',
        'primary-dark':   'oklch(0.680 0.158 66)',
        'primary-light':  'oklch(0.948 0.032 78)',
        'sidebar-bg':     'oklch(0.108 0.016 68)',
        accent:           'oklch(0.578 0.108 48)',
        'accent-light':   'oklch(0.948 0.026 52)',
        secondary:        'oklch(0.545 0.088 165)',
        success:          'oklch(0.555 0.182 148)',
        warning:          'oklch(0.625 0.160 78)',
        danger:           'oklch(0.545 0.212 28)',
        background:       'oklch(0.952 0.008 78)',
        surface:          'oklch(0.992 0.003 80)',
      },
      fontFamily: {
        heading: ['"Bricolage Grotesque"', 'sans-serif'],
        body:    ['"Instrument Sans"', 'sans-serif'],
        sans:    ['"Instrument Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
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
