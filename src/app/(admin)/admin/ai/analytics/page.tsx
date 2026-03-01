import { getUsageStats, getDailyBreakdown, getTopQueries } from './actions'
import { StatsCards } from './_components/StatsCards'
import { UsageChart } from './_components/UsageChart'
import { TopQueries } from './_components/TopQueries'
import { LimitSettings } from './_components/LimitSettings'

export default async function AiAnalyticsPage() {
  const [stats, dailyBreakdown, topQueries] = await Promise.all([
    getUsageStats(),
    getDailyBreakdown(),
    getTopQueries(10),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          AI Analytics
        </h1>
        <p className="text-text-secondary mt-1">
          AI チャットの利用状況とコスト管理
        </p>
      </div>

      <StatsCards stats={stats} />

      <UsageChart data={dailyBreakdown} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopQueries queries={topQueries} />
        <LimitSettings limits={stats.limits} />
      </div>
    </div>
  )
}
