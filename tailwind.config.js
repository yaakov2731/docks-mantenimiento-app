/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:         '#2563EB',
        'primary-dark':  '#1E40AF',
        'primary-light': '#DBEAFE',
        'sidebar-bg':    '#0F172A',
        accent:          '#10B981',
        'accent-light':  '#D1FAE5',
        secondary:       '#8B5CF6',
        success:         '#059669',
        warning:         '#D97706',
        danger:          '#DC2626',
        background:      '#F1F5F9',
        surface:         '#FFFFFF',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
        mono:    ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      borderRadius: {
        sm:      '6px',
        DEFAULT: '8px',
        md:      '10px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
        '3xl':   '24px',
        '4xl':   '32px',
        full:    '9999px',
      },
    },
  },
  plugins: [],
}
