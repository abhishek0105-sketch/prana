/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#020C18',
        surface:  'rgba(255,255,255,0.08)',
        surface2: 'rgba(255,255,255,0.05)',
        border:   'rgba(255,255,255,0.12)',
        blue:     '#00B4FF',
        green:    '#00E5A0',
        teal:     '#00CFD5',
        blue2:    '#0070F3',
        gold:     '#FBBF24',
        navy:     '#020C18',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'grad':      'linear-gradient(135deg, #00B4FF 0%, #00CFD5 50%, #00E5A0 100%)',
        'grad-btn':  'linear-gradient(135deg, #00B4FF 0%, #00E5A0 100%)',
        'grad-warm': 'linear-gradient(135deg, #00B4FF 0%, #0070F3 100%)',
        'grad-gold': 'linear-gradient(135deg, #FBBF24 0%, #00E5A0 100%)',
        'grad-teal': 'linear-gradient(135deg, #00CFD5 0%, #0070F3 100%)',
      },
      animation: {
        'float':        'float 5s ease-in-out infinite',
        'shimmer':      'shimmer 3s linear infinite',
        'glow-pulse':   'glow-pulse 2s ease-in-out infinite',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'aurora-glow':  'auroraGlow 3s ease-in-out infinite',
        'story-ring':   'storyRing 2s ease-in-out infinite',
      },
      borderRadius: { '3xl': '24px', '4xl': '32px' },
      boxShadow: {
        'glow-blue':   '0 0 40px rgba(0,180,255,0.6)',
        'glow-green':  '0 0 40px rgba(0,229,160,0.6)',
        'glow-gold':   '0 0 40px rgba(251,191,36,0.6)',
        'glow-teal':   '0 0 40px rgba(0,207,213,0.6)',
      }
    },
  },
  plugins: [],
};
