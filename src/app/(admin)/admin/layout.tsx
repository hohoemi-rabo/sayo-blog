import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata = {
  title: '管理画面 | Sayo\'s Journal',
  robots: 'noindex, nofollow',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FAFAFA]">
        <Sidebar />
        <Header />
        <main className="ml-64 pt-16 min-h-screen">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
