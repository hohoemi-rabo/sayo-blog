/**
 * Framer Motion Animation Variants
 * Common animation patterns for the design system
 */

import { Variants } from 'framer-motion'

/**
 * Fade in animation
 * Used for general content appearance
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
}

/**
 * Slide in from bottom
 * Used for cards and sections
 */
export const slideInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

/**
 * Card hover animation
 * Used for interactive cards (post cards, etc.)
 */
export const cardHover: Variants = {
  rest: {
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
  hover: {
    scale: 1.03,
    y: -4,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
}

/**
 * Stagger children animation
 * Used for lists and grids
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

/**
 * Stagger child item
 * Used with staggerContainer
 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

/**
 * Scale on hover
 * Used for buttons and interactive elements
 */
export const scaleOnHover: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
}

/**
 * Fade and slide from left
 * Used for side navigation and panels
 */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

/**
 * Fade and slide from right
 * Used for side navigation and panels
 */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

/**
 * Animation for scroll progress bar
 */
export const progressBar: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
}

/**
 * Animation presets for common durations
 */
export const ANIMATION_DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const

/**
 * Easing presets
 */
export const EASING = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
} as const
