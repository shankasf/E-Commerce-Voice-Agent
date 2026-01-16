/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0e1a',
          secondary: '#0d1221',
          tertiary: '#111827'
        },
        panel: {
          DEFAULT: '#131a2b',
          hover: '#1a2337',
          active: '#1e2a42',
          border: 'rgba(255, 255, 255, 0.06)'
        },
        text: {
          DEFAULT: '#f0f4ff',
          muted: '#94a3b8',
          dim: '#64748b'
        },
        primary: {
          DEFAULT: '#3ecf9a',
          hover: '#34b888',
          dim: '#2a9a7d',
          light: '#4ade80'
        },
        accent: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          light: '#fbbf24'
        },
        danger: {
          DEFAULT: '#ef4444',
          hover: '#dc2626',
          light: '#f87171'
        },
        success: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          light: '#4ade80'
        },
        warning: {
          DEFAULT: '#eab308',
          hover: '#ca8a04',
          light: '#facc15'
        },
        info: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          light: '#60a5fa'
        },
        border: 'rgba(255, 255, 255, 0.06)'
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace']
      },
      fontSize: {
        '2xs': '0.625rem',
        '3xs': '0.5rem'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        'glow': '0 0 24px rgba(62, 207, 154, 0.12)',
        'glow-lg': '0 0 40px rgba(62, 207, 154, 0.18)',
        'panel': '0 4px 24px rgba(0, 0, 0, 0.25)',
        'panel-lg': '0 8px 40px rgba(0, 0, 0, 0.35)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'button': '0 1px 2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'input': '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'shimmer': 'shimmer 2s infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms'
      }
    },
  },
  plugins: [],
}
