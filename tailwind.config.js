/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a2e',
        card: '#16213e',
        deep: '#0f3460',
        accent: '#e94560',
      },
    },
  },
  plugins: [],
}
