import { headers } from 'next/headers'
import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'
import { ToastProvider } from '@/components/ui/Toast'
import { getInquiryCounts } from './inquiries/actions'

export const metadata = {
  title: '管理画面 | Sayo\'s Journal',
  robots: 'noindex, nofollow',
}

/** Sidebar の未読バッジ用に依頼の pending 件数を取得 (失敗しても 0 で続行) */
async function getInquiriesPendingCount(): Promise<number> {
  try {
    const counts = await getInquiryCounts()
    return counts.miniPending + counts.longPending
  } catch {
    return 0
  }
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

  const inquiriesPending = await getInquiriesPendingCount()

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FAFAFA]">
        <Sidebar inquiriesPending={inquiriesPending} />
        <Header />
        <main className="ml-64 pt-16 min-h-screen">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
