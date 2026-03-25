'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { BarChart3 } from 'lucide-react'
import type { DailyBreakdown } from '../actions'

interface UsageChartProps {
  data: DailyBreakdown[]
}

export function UsageChart({ data }: UsageChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const maxQueries = Math.max(...data.map((d) => d.queries), 1)

  // Fill in missing dates for current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  const dataMap = new Map(data.map((d) => [d.date, d]))
  const filledData: DailyBreakdown[] = []

  for (let day = 1; day <= today; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const existing = dataMap.get(dateStr)
    filledData.push(existing || { date: dateStr, queries: 0, tokens: 0 })
  }

  const filledMax = Math.max(...filledData.map((d) => d.queries), 1)

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-text-secondary" />
        <h2 className="text-lg font-semibold text-text-primary">
          日別利用状況
        </h2>
        <span className="text-sm text-text-secondary ml-auto">
          {year}年{month + 1}月
        </span>
      </div>

      {filledData.length === 0 ? (
        <p className="text-text-secondary text-sm py-8 text-center">
          データがありません
        </p>
      ) : (
        <div className="relative">
          {/* Chart */}
          <div className="relative flex items-end gap-[2px] h-48 bg-gray-50 rounded-lg p-1 border border-gray-200">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-evenly pointer-events-none px-1">
              <div className="border-b border-gray-200" />
              <div className="border-b border-gray-200" />
              <div className="border-b border-gray-200" />
            </div>
            {filledData.map((item, index) => {
              const height =
                filledMax > 0 ? (item.queries / filledMax) * 100 : 0
              const day = parseInt(item.date.split('-')[2])

              return (
                <div
                  key={item.date}
                  className="flex-1 relative group"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip */}
                  {hoveredIndex === index && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
                      <p className="font-medium">{item.date}</p>
                      <p>{item.queries} 件</p>
                      <p>{item.tokens.toLocaleString()} トークン</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t transition-colors ${
                      hoveredIndex === index
                        ? 'bg-primary'
                        : item.queries > 0
                          ? 'bg-primary/60'
                          : 'bg-gray-100'
                    }`}
                    style={{
                      height: `${Math.max(height, item.queries > 0 ? 2 : 0)}%`,
                      minHeight: item.queries > 0 ? '2px' : '0',
                    }}
                  />

                  {/* Day label (show every 5 days + 1st) */}
                  {(day === 1 || day % 5 === 0) && (
                    <p className="text-[10px] text-text-secondary text-center mt-1">
                      {day}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Y axis label */}
          <div className="absolute left-0 top-0 -translate-x-full pr-2 text-xs text-text-secondary">
            {maxQueries}
          </div>
        </div>
      )}
    </Card>
  )
}
