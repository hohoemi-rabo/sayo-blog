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
  // 2026-10 再編: 旧 gourmet
  food: {
    from: 'from-category-food-start',
    to: 'to-category-food-end',
    gradientClass: 'bg-gradient-to-r from-category-food-start to-category-food-end',
  },
  event: {
    from: 'from-category-travel-start',
    to: 'to-category-travel-end',
    gradientClass: 'bg-gradient-to-r from-category-travel-start to-category-travel-end',
  },
  // 旧 spot
  outing: {
    from: 'from-category-landscape-start',
    to: 'to-category-landscape-end',
    gradientClass: 'bg-gradient-to-r from-category-landscape-start to-category-landscape-end',
  },
  culture: {
    from: 'from-category-tradition-start',
    to: 'to-category-tradition-end',
    gradientClass: 'bg-gradient-to-r from-category-tradition-start to-category-tradition-end',
  },
  // 旧 news の色を引き継ぐ
  life: {
    from: 'from-category-words-start',
    to: 'to-category-words-end',
    gradientClass: 'bg-gradient-to-r from-category-words-start to-category-words-end',
  },
  // 新設。people 色は food のオレンジと見分けにくいので nature の緑を使う
  people: {
    from: 'from-category-nature-start',
    to: 'to-category-nature-end',
    gradientClass: 'bg-gradient-to-r from-category-nature-start to-category-nature-end',
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
