/**
 * Category color gradient mappings
 * Maps category slugs to Tailwind gradient classes
 */

export interface CategoryGradient {
  from: string
  to: string
  gradientClass: string
}

const CATEGORY_GRADIENTS: Record<string, CategoryGradient> = {
  // Prefecture categories (for now, using generic gradient)
  nagano: {
    from: 'from-category-nature-start',
    to: 'to-category-nature-end',
    gradientClass: 'bg-gradient-to-r from-category-nature-start to-category-nature-end',
  },
  tokyo: {
    from: 'from-category-travel-start',
    to: 'to-category-travel-end',
    gradientClass: 'bg-gradient-to-r from-category-travel-start to-category-travel-end',
  },

  // Content categories
  people: {
    from: 'from-category-people-start',
    to: 'to-category-people-end',
    gradientClass: 'bg-gradient-to-r from-category-people-start to-category-people-end',
  },
  food: {
    from: 'from-category-food-start',
    to: 'to-category-food-end',
    gradientClass: 'bg-gradient-to-r from-category-food-start to-category-food-end',
  },
  landscape: {
    from: 'from-category-landscape-start',
    to: 'to-category-landscape-end',
    gradientClass: 'bg-gradient-to-r from-category-landscape-start to-category-landscape-end',
  },
  travel: {
    from: 'from-category-travel-start',
    to: 'to-category-travel-end',
    gradientClass: 'bg-gradient-to-r from-category-travel-start to-category-travel-end',
  },
  tradition: {
    from: 'from-category-tradition-start',
    to: 'to-category-tradition-end',
    gradientClass: 'bg-gradient-to-r from-category-tradition-start to-category-tradition-end',
  },
  nature: {
    from: 'from-category-nature-start',
    to: 'to-category-nature-end',
    gradientClass: 'bg-gradient-to-r from-category-nature-start to-category-nature-end',
  },
  words: {
    from: 'from-category-words-start',
    to: 'to-category-words-end',
    gradientClass: 'bg-gradient-to-r from-category-words-start to-category-words-end',
  },
}

// Default gradient for unknown categories
const DEFAULT_GRADIENT: CategoryGradient = {
  from: 'from-primary',
  to: 'to-primary-hover',
  gradientClass: 'bg-gradient-to-r from-primary to-primary-hover',
}

/**
 * Get gradient class for a category slug
 */
export function getCategoryGradient(slug: string): CategoryGradient {
  return CATEGORY_GRADIENTS[slug] || DEFAULT_GRADIENT
}

/**
 * Get all category gradients (useful for prefetching)
 */
export function getAllCategoryGradients(): Record<string, CategoryGradient> {
  return CATEGORY_GRADIENTS
}
