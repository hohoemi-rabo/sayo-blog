import { BarChart3 } from 'lucide-react'

export default function AiAnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-gray-400" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary">AI Analytics</h1>
      <p className="text-text-secondary">Ticket 28 で実装予定</p>
    </div>
  )
}
