import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: '#FF6B9D',
        'primary-hover': '#FF8FB3',

        // Background colors
        background: '#FAF8F5',
        'background-dark': '#2D2B29',

        // Text colors
        'text-primary': '#1A1816',
        'text-secondary': '#6B6865',

        // Accent colors
        'accent-turquoise': '#4ECDC4',
        'accent-purple': '#9B59B6',

        // Border colors
        'border-decorative': '#D4C5B9',

        // Category gradient colors
        category: {
          'people-start': '#E8A87C',
          'people-end': '#F5C794',
          'food-start': '#FFB75E',
          'food-end': '#FFD194',
          'landscape-start': '#4FC3F7',
          'landscape-end': '#81D4FA',
          'travel-start': '#5C6BC0',
          'travel-end': '#7986CB',
          'tradition-start': '#8D6E63',
          'tradition-end': '#A1887F',
          'nature-start': '#66BB6A',
          'nature-end': '#81C784',
          'words-start': '#AB47BC',
          'words-end': '#BA68C8',
        },
      },
      fontFamily: {
        // Heading fonts
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],

        // Body fonts (Japanese)
        'noto-serif-jp': ['var(--font-noto-serif-jp)', 'serif'],

        // UI fonts
        'noto-sans-jp': ['var(--font-noto-sans-jp)', 'sans-serif'],

        // Legacy fonts (will be replaced)
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'decorative': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'decorative-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
