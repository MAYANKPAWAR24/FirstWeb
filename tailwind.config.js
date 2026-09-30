/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* One accent family (teal-cyan), one secondary (indigo-violet), and a
           warm editorial tone reserved for literature. Everything else is
           neutral. This is the whole palette — resist adding more. */
        accent: {
          50: '#eefbff',
          100: '#d6f4ff',
          200: '#ade9ff',
          300: '#74d9fb',
          400: '#34c0f2',
          500: '#12a2de',
          600: '#0a82bd',
          700: '#0c6899',
          800: '#10567c',
          900: '#134969',
        },
        iris: {
          50: '#f2f2ff',
          100: '#e6e5ff',
          200: '#d0ceff',
          300: '#aeabfd',
          400: '#8b83f8',
          500: '#7162ef',
          600: '#6146df',
          700: '#5338c0',
          800: '#46319b',
          900: '#3c2f7c',
        },
        ember: {
          50: '#fff5f3',
          100: '#ffe8e3',
          200: '#ffd5cc',
          300: '#ffb8a8',
          400: '#fd8e77',
          500: '#f96b51',
          600: '#e64f37',
          700: '#c03a26',
          800: '#9e3224',
          900: '#822f24',
        },
        /* Neutral surface ramp. `frost` is the page, `surface` is a card. */
        frost: {
          50: '#fbfbfd',
          100: '#f5f5f8',
          200: '#eeeef3',
          300: '#e3e3ec',
          400: '#d3d3e0',
          500: '#b9b9cb',
        },
        graphite: {
          300: '#a9a9b8',
          400: '#82828f',
          500: '#63636f',
          600: '#4a4a56',
          700: '#35353f',
          800: '#24242c',
          900: '#15151b',
          950: '#0c0c11',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        /* Reading face for the literature view only. */
        literary: ['"Noto Serif"', 'Georgia', '"Noto Sans Devanagari"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        /* Fluid display scale. `clamp` avoids the awkward jump between the
           breakpoints that the old `text-5xl sm:text-7xl lg:text-8xl` had. */
        display: ['clamp(2.6rem, 8.5vw, 5.75rem)', { lineHeight: '1.02', letterSpacing: '-0.035em' }],
        'display-sm': ['clamp(2.1rem, 6vw, 3.6rem)', { lineHeight: '1.06', letterSpacing: '-0.03em' }],
        title: ['clamp(1.55rem, 3.4vw, 2.35rem)', { lineHeight: '1.15', letterSpacing: '-0.022em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.28em' }],
      },
      borderRadius: {
        xs: '0.375rem',
        card: '1.125rem',
        panel: '1.5rem',
        shell: '2rem',
      },
      boxShadow: {
        /* One elevation ladder. Previously six unrelated systems coexisted. */
        lift: '0 1px 2px rgba(12,12,17,0.04), 0 8px 24px -12px rgba(12,12,17,0.14)',
        raised: '0 2px 4px rgba(12,12,17,0.05), 0 18px 44px -20px rgba(12,12,17,0.22)',
        panel: '0 8px 20px -8px rgba(12,12,17,0.14), 0 32px 80px -36px rgba(12,12,17,0.34)',
        'glow-accent': '0 0 0 1px rgba(10,130,189,0.22), 0 10px 30px -12px rgba(10,130,189,0.36)',
        'glow-iris': '0 0 0 1px rgba(97,70,223,0.2), 0 10px 30px -12px rgba(97,70,223,0.32)',
      },
      transitionTimingFunction: {
        /* The single easing vocabulary. Replaces ~11 ad-hoc durations. */
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        micro: '140ms',
        hover: '220ms',
        modal: '320ms',
        drawer: '380ms',
        reveal: '620ms',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0,26px,0)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translate3d(0,10px,0) scale(0.975)' },
          to: { opacity: '1', transform: 'none' },
        },
        'sheet-up': {
          from: { opacity: '0', transform: 'translate3d(0,28px,0)' },
          to: { opacity: '1', transform: 'none' },
        },
        'drawer-in': {
          from: { opacity: '0', transform: 'translate3d(0,-8px,0)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          from: { backgroundPosition: '-160% 0' },
          to: { backgroundPosition: '260% 0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-ring': {
          '0%': { opacity: '0.55', transform: 'scale(1)' },
          '70%': { opacity: '0', transform: 'scale(2.6)' },
          '100%': { opacity: '0', transform: 'scale(2.6)' },
        },
        'scroll-hint': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '35%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(9px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up var(--dur-reveal) var(--ease-out-expo) both',
        'fade-in': 'fade-in var(--dur-modal) var(--ease-out-expo) both',
        'scale-in': 'scale-in var(--dur-modal) var(--ease-out-expo) both',
        'sheet-up': 'sheet-up var(--dur-drawer) var(--ease-out-expo) both',
        'drawer-in': 'drawer-in var(--dur-drawer) var(--ease-out-expo) both',
        shimmer: 'shimmer 2.4s linear infinite',
        'spin-slow': 'spin-slow 1s linear infinite',
        'pulse-ring': 'pulse-ring 2.8s var(--ease-out-quint) infinite',
        'scroll-hint': 'scroll-hint 2s var(--ease-out-quint) infinite',
      },
    },
  },
  plugins: [],
};
