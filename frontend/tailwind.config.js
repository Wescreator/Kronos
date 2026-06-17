/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        kronos: {
          bg:      '#0A0A0A',
          sidebar: '#111111',
          card:    '#1B1B1B',
          hover:   '#232323',
          primary: '#7C5CFC',
          glow:    '#A78BFA',
          success: '#34D399',
          danger:  '#FB7185',
          info:    '#38BDF8',
          warning: '#FBBF24',
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'soft':   '0 8px 24px rgba(0,0,0,0.30)',
        'medium': '0 16px 40px rgba(0,0,0,0.40)',
        'large':  '0 24px 60px rgba(0,0,0,0.50)',
        'purple': '0 0 40px rgba(124,92,252,0.10)',
        'blue':   '0 0 40px rgba(56,189,248,0.08)',
        'green':  '0 0 40px rgba(52,211,153,0.08)',
      },
      animation: {
        'fade-in': 'fadeInUp 0.4s ease forwards',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
      }
    }
  },
  plugins: []
}