'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Header() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
      })
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-white border-b border-border-decorative">
      <div className="flex h-full items-center justify-between px-6">
        <div>
          {/* Placeholder for page title or breadcrumbs */}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2 text-text-secondary hover:text-text-primary"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </header>
  )
}
