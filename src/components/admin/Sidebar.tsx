'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Hash,
  ImageIcon,
  Images,
  BookOpen,
  Tags,
  BarChart3,
  Send,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'ダッシュボード', href: '/admin', icon: LayoutDashboard },
  { name: '記事', href: '/admin/posts', icon: FileText },
  { name: 'カテゴリ', href: '/admin/categories', icon: FolderOpen },
  { name: 'ハッシュタグ', href: '/admin/hashtags', icon: Hash },
  { name: 'メディア', href: '/admin/media', icon: ImageIcon },
  { name: 'ギャラリー', href: '/admin/gallery', icon: Images },
]

const inquiriesNavigation = [
  { name: '依頼管理', href: '/admin/inquiries', icon: Inbox },
]

const instagramNavigation = [
  { name: 'IG 投稿管理', href: '/admin/instagram/posts', icon: Send },
]

const aiNavigation = [
  { name: 'AI Knowledge', href: '/admin/ai/knowledge', icon: BookOpen },
  { name: 'AI Tags', href: '/admin/ai/tags', icon: Tags },
  { name: 'AI Analytics', href: '/admin/ai/analytics', icon: BarChart3 },
]

interface SidebarProps {
  /** 情報窓口の未処理 (pending) 件数。0 のときバッジ非表示 */
  inquiriesPending?: number
}

export function Sidebar({ inquiriesPending = 0 }: SidebarProps) {
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

        {/* 依頼管理セクション */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            情報窓口
          </p>
          {inquiriesNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href)

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
                <span className="flex-1">{item.name}</span>
                {inquiriesPending > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                    {inquiriesPending}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Instagram 連携セクション */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Instagram 連携
          </p>
          {instagramNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href)

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
        </div>

        {/* AI 管理セクション */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            AI 管理
          </p>
          {aiNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href)

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
        </div>
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
