import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Category } from '@/lib/types'

interface BreadcrumbsProps {
  categories: Category[]
  title: string
}

export default function Breadcrumbs({ categories, title }: BreadcrumbsProps) {
  // Build breadcrumb path: Home > Prefecture > City > District > Article
  const breadcrumbs = [
    { name: 'ホーム', href: '/' },
    ...categories.map((category) => ({
      name: category.name,
      href: `/${category.slug}`,
    })),
  ]

  return (
    <nav className="mb-6" aria-label="Breadcrumb">
      <ol
        className="flex items-center flex-wrap gap-2 text-sm text-text-secondary font-noto-sans-jp"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {breadcrumbs.map((breadcrumb, index) => (
          <li
            key={breadcrumb.href}
            className="flex items-center gap-2"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {index > 0 && <ChevronRight className="w-3 h-3 text-text-secondary/50" />}
            <Link
              href={breadcrumb.href}
              className="hover:text-primary hover:underline transition-colors"
              itemProp="item"
            >
              <span itemProp="name">{breadcrumb.name}</span>
            </Link>
            <meta itemProp="position" content={String(index + 1)} />
          </li>
        ))}

        {/* Current article (not a link) */}
        <li
          className="flex items-center gap-2"
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <ChevronRight className="w-3 h-3 text-text-secondary/50" />
          <span className="text-text-primary line-clamp-1" itemProp="name">
            {title}
          </span>
          <meta itemProp="position" content={String(breadcrumbs.length + 1)} />
        </li>
      </ol>
    </nav>
  )
}
