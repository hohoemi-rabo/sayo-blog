import { parseInquiryTab } from './filters'
import {
  getInquiryCounts,
  getMiniInquiries,
  getLongInquiries,
  getLinkablePosts,
} from './actions'
import { InquiriesTabs } from './_components/InquiriesTabs'
import { MiniInquiriesList } from './_components/MiniInquiriesList'
import { LongInquiriesList } from './_components/LongInquiriesList'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ tab?: string; open?: string }>
}

export default async function InquiriesPage({ searchParams }: PageProps) {
  const { tab, open } = await searchParams
  const activeTab = parseInquiryTab(tab)

  const counts = await getInquiryCounts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">依頼管理</h1>
        <p className="mt-1 text-text-secondary">
          情報窓口フォームから届いた依頼を管理します
        </p>
      </div>

      <InquiriesTabs activeTab={activeTab} counts={counts} />

      {activeTab === 'mini' ? (
        <MiniInquiriesList items={await getMiniInquiries()} openId={open} />
      ) : (
        <LongInquiriesList
          items={await getLongInquiries()}
          openId={open}
          linkablePosts={await getLinkablePosts()}
        />
      )}
    </div>
  )
}
