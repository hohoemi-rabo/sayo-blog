import { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium font-noto-sans-jp transition-all duration-200',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary hover:bg-primary/20',
        secondary:
          'bg-background-dark/10 text-text-primary hover:bg-background-dark/20',
        outline:
          'border border-border-decorative text-text-primary hover:bg-background-dark/5',
        people:
          'bg-gradient-to-r from-category-people-start to-category-people-end text-white shadow-sm',
        food:
          'bg-gradient-to-r from-category-food-start to-category-food-end text-white shadow-sm',
        landscape:
          'bg-gradient-to-r from-category-landscape-start to-category-landscape-end text-white shadow-sm',
        travel:
          'bg-gradient-to-r from-category-travel-start to-category-travel-end text-white shadow-sm',
        tradition:
          'bg-gradient-to-r from-category-tradition-start to-category-tradition-end text-white shadow-sm',
        nature:
          'bg-gradient-to-r from-category-nature-start to-category-nature-end text-white shadow-sm',
        words:
          'bg-gradient-to-r from-category-words-start to-category-words-end text-white shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
