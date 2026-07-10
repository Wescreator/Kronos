/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Semânticas — apontam para os tokens de tema (index.css).
           Assim classes utilitárias (bg-surface, text-primary, border-subtle)
           e inline style={{color:'var(--text-primary)'}} resolvem no mesmo lugar
           e ambos reagem ao toggle de tema. */
        app:        'var(--bg-app)',
        surface:    'var(--bg-surface)',
        'surface-2':'var(--bg-surface-2)',
        sidebar:    'var(--bg-sidebar)',
        hover:      'var(--bg-hover)',

        primary:    'var(--text-primary)',
        secondary:  'var(--text-secondary)',
        muted:      'var(--text-muted)',
        onbrand:    'var(--text-onbrand)',

        'border-subtle': 'var(--border-subtle)',
        'border-medium': 'var(--border-medium)',
        line:        'var(--border-subtle)',
        'line-strong':'var(--border-medium)',

        brand:      'var(--brand-slate)',
        success:    'var(--accent-success)',
        danger:     'var(--accent-danger)',
        info:       'var(--accent-info)',
        warning:    'var(--accent-warning)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'soft':   'var(--shadow-soft)',
        'medium': 'var(--shadow-medium)',
        'large':  'var(--shadow-large)',
        'glow-purple': 'var(--glow-purple)',
        'glow-blue':   'var(--glow-blue)',
        'glow-green':  'var(--glow-green)',
      },
      animation: {
        'fade-in': 'fadeInUp 0.4s ease forwards',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
      }
    }
  },
  plugins: []
}
