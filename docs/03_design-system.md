# 03: Design System Implementation

## Overview

Implement the "Poetic Psychedelic × Decorative Narrative" design system including color palette, typography, spacing, and base components.

## Related Files

- `tailwind.config.ts` - Tailwind configuration
- `src/app/globals.css` - Global styles
- `src/components/ui/` - Base UI components
- `public/fonts/` - Custom fonts (if self-hosted)

## Technical Details

### Color Palette

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: '#FF6B9D',
        'primary-hover': '#FF8FB3',
        background: '#FAF8F5',
        'background-dark': '#2D2B29',
        'text-primary': '#1A1816',
        'text-secondary': '#6B6865',
        'accent-turquoise': '#4ECDC4',
        'accent-purple': '#9B59B6',
        'border-decorative': '#D4C5B9',

        // Category gradients
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
    },
  },
};
```

### Typography

```typescript
// src/app/layout.tsx
import { Playfair_Display, Noto_Serif_JP, Noto_Sans_JP } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  variable: '--font-noto-serif-jp',
  weight: ['400', '500', '700'],
  display: 'swap',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  weight: ['400', '500', '700'],
  display: 'swap',
})
```

## Todo

### Tailwind Configuration

- [×] Add color palette to `tailwind.config.ts`
- [×] Configure category gradient utilities
- [×] Add custom font family variables
- [×] Set up spacing scale (if custom needed)
- [×] Add custom border radius values
- [×] Configure animation keyframes for hover effects

### Typography Setup

- [×] Import Google Fonts (Playfair Display, Noto Serif JP, Noto Sans JP)
- [×] Configure font variables in layout.tsx
- [×] Add font-family utilities to Tailwind config
- [×] Test font loading and fallbacks
- [×] Add font-display: swap for performance

### Global Styles

- [×] Set up CSS custom properties in globals.css
- [×] Define base typography styles
- [×] Add smooth scrolling behavior
- [×] Configure default link styles
- [×] Add focus-visible styles for accessibility

### Base Components

- [×] Create `Button` component with variants
  - [×] Primary variant (gradient background)
  - [×] Secondary variant (outline)
  - [×] Ghost variant
  - [×] Icon button variant
- [×] Create `Card` component
  - [×] Default card with shadow
  - [×] Hover animation (scale 1.03)
  - [×] Category color accent
- [×] Create `Badge` component for categories/tags
  - [×] Category gradient backgrounds
  - [×] Rounded pill shape
- [ ] Create `Input` component (will be created when needed)
  - [ ] Text input
  - [ ] Search input with icon
- [ ] Create `Select` component (will be created when needed)

### Motion System

- [×] Install Framer Motion (`npm install framer-motion`)
- [×] Create motion variants for common animations:
  - [×] Card hover (scale + shadow)
  - [×] Fade in on scroll
  - [×] Stagger children
- [×] Document animation duration standards (0.2s, 0.3s, 0.5s)

### Documentation

- [ ] Create Storybook or component showcase page (Phase 2)
- [ ] Document color usage guidelines (Phase 2)
- [ ] Document typography hierarchy (Phase 2)
- [ ] Create examples for each component variant (Phase 2)

## Design Tokens

```css
/* globals.css */
:root {
  --color-primary: #FF6B9D;
  --color-primary-hover: #FF8FB3;
  --color-background: #FAF8F5;
  --color-text-primary: #1A1816;
  --color-text-secondary: #6B6865;

  --font-heading: var(--font-playfair);
  --font-body: var(--font-noto-serif-jp);
  --font-ui: var(--font-noto-sans-jp);

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

## References

- REQUIREMENTS.md - Section 3 (Design Requirements)
- CLAUDE.md - Design System section
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)

## Validation

- [ ] All colors pass WCAG AA contrast requirements
- [ ] Fonts load correctly on all browsers
- [ ] Components are responsive (375px - 1920px)
- [ ] Hover effects work smoothly
- [ ] Dark mode variants (if needed for Phase 2)
