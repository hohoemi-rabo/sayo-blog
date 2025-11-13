import { Category } from '@/lib/types'
import { getCategoryGradient } from '@/lib/category-colors'
import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  category: Category
  className?: string
}

export default function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const gradient = getCategoryGradient(category.slug)

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium font-noto-sans-jp text-white shadow-md backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:scale-105',
        gradient.gradientClass,
        className
      )}
      style={{
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      }}
    >
      {category.name}
    </span>
  )
}
