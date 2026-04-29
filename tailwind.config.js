/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          'oklch(0.748 0.162 70)',
        'primary-dark':   'oklch(0.680 0.158 66)',
        'primary-light':  'oklch(0.940 0.036 78)',
        'sidebar-bg':     'oklch(0.108 0.022 258)',
        accent:           'oklch(0.588 0.148 215)',
        'accent-light':   'oklch(0.934 0.030 215)',
        secondary:        'oklch(0.545 0.088 165)',
        success:          'oklch(0.555 0.182 148)',
        warning:          'oklch(0.625 0.160 78)',
        danger:           'oklch(0.545 0.212 28)',
        background:       'oklch(0.944 0.006 250)',
        surface:          'oklch(0.985 0.002 252)',
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
