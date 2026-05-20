/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#000000',
        surface:  '#0D0D0D',
        surface2: '#141414',
        border:   'rgba(255,255,255,0.09)',
        violet:   '#8B5CF6',
        pink:     '#F472B6',
        gold:     '#FBBF24',
        teal:     '#2DD4BF',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'grad':      'linear-gradient(135deg, #8B5CF6 0%, #F472B6 100%)',
        'grad-gold': 'linear-gradient(135deg, #FBBF24 0%, #F87171 100%)',
        'grad-teal': 'linear-gradient(135deg, #2DD4BF 0%, #8B5CF6 100%)',
        'grad-dark': 'linear-gradient(135deg, #0D0D0D 0%, #141414 100%)',
      },
      animation: {
        'float':      'float 5s ease-in-out infinite',
        'shimmer':    'shimmer 3s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      borderRadius: { '3xl': '24px', '4xl': '32px' },
      boxShadow: {
        'glow-violet': '0 0 40px rgba(139,92,246,0.6)',
        'glow-pink':   '0 0 40px rgba(244,114,182,0.6)',
        'glow-gold':   '0 0 40px rgba(251,191,36,0.6)',
      }
    },
  },
  plugins: [],
};
