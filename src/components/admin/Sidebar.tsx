'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Hash,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'ダッシュボード', href: '/admin', icon: LayoutDashboard },
  { name: '記事', href: '/admin/posts', icon: FileText },
  { name: 'カテゴリ', href: '/admin/categories', icon: FolderOpen },
  { name: 'ハッシュタグ', href: '/admin/hashtags', icon: Hash },
  { name: 'メディア', href: '/admin/media', icon: ImageIcon },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#1A1A1A] text-white">
      <div className="flex h-16 items-center justify-center border-b border-white/10">
        <Link href="/admin" className="text-xl font-bold text-primary">
          Sayo&apos;s Admin
        </Link>
      </div>

      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          サイトを表示
        </Link>
      </div>
    </aside>
  )
}
