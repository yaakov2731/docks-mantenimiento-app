/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-dark': '#1E40AF',
        'primary-light': '#DBEAFE',
        'sidebar-bg': '#0F172A',
        accent: '#10B981',
        'accent-light': '#D1FAE5',
        secondary: '#8B5CF6',
        success: '#059669',
        warning: '#D97706',
        danger: '#DC2626',
        background: '#F9FAFB',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
