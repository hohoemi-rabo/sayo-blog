import { headers } from 'next/headers'
import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata = {
  title: '管理画面 | Sayo\'s Journal',
  robots: 'noindex, nofollow',
}

// Routes that should render without the admin chrome (sidebar / header / margins).
// Currently used for the article preview page so it matches the public look.
const CHROMELESS_PATTERNS = [/^\/admin\/posts\/[^/]+\/preview(\/|$)/]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''
  const isChromeless = CHROMELESS_PATTERNS.some((re) => re.test(pathname))

  if (isChromeless) {
    return <ToastProvider>{children}</ToastProvider>
  }

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
