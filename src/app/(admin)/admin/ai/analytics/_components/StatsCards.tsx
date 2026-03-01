import { Card } from '@/components/ui/Card'
import { MessageCircle, Calendar, DollarSign, Activity } from 'lucide-react'
import type { UsageStats } from '../actions'

interface StatsCardsProps {
  stats: UsageStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const percentage = stats.limits.monthly_site.percentage
  const percentageColor =
    percentage >= 80
      ? 'text-red-600'
      : percentage >= 50
        ? 'text-amber-600'
        : 'text-green-600'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">今日の質問数</p>
            <p className="text-2xl font-bold text-text-primary">
              {stats.today.total_queries}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {stats.today.unique_sessions} セッション
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-accent-turquoise/10">
            <Calendar className="h-6 w-6 text-accent-turquoise" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">今月の質問数</p>
            <p className="text-2xl font-bold text-text-primary">
              {stats.this_month.total_queries.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {stats.this_month.unique_sessions} セッション
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-100">
            <DollarSign className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">今月の推定コスト</p>
            <p className="text-2xl font-bold text-text-primary">
              {stats.this_month.estimated_cost_jpy}
              <span className="text-sm font-normal ml-1">円</span>
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {stats.this_month.total_tokens.toLocaleString()} トークン
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gray-100">
            <Activity className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">月次制限消費率</p>
            <p className={`text-2xl font-bold ${percentageColor}`}>
              {percentage}
              <span className="text-sm font-normal ml-1">%</span>
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {stats.limits.monthly_site.current_value.toLocaleString()} /{' '}
              {stats.limits.monthly_site.limit_value.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
