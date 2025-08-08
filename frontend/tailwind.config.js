// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: {
        '46': '11.5rem',
      },
      fontFamily: {
        reeniebeanie: ['"Reenie Beanie"', 'cursive'],
        scentic: ['Scentic', 'sans-serif'],
        mulish: ['Mulish', 'sans-serif'],
      },
      keyframes: {
        ripple: {
          '0%': { 
            transform: 'scale(1)',
            opacity: '0.2'
          },
          '50%': { 
            transform: 'scale(1.1)',
            opacity: '0.1'
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '0.2'
          },
        }
      },
      animation: {
        'ripple': 'ripple 2s ease-in-out infinite',
      }
    },
  },
  plugins: [require('tailwind-scrollbar')],
}