/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0A7EA4',
        'primary-dark': '#075f7a',
        'sidebar-bg': '#1E2832',
        accent: '#FF6B35',
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        background: '#F8F9FA',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
