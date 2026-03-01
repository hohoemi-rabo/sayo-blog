'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// Gemini Flash pricing (JPY per 1M tokens)
const INPUT_COST_PER_1M = 5
const OUTPUT_COST_PER_1M = 15

function estimateCostJPY(inputTokens: number, outputTokens: number): number {
  return Math.round(
    ((inputTokens * INPUT_COST_PER_1M + outputTokens * OUTPUT_COST_PER_1M) /
      1_000_000) *
      100
  ) / 100
}

export interface UsageStats {
  today: {
    total_queries: number
    total_tokens: number
    token_input: number
    token_output: number
    unique_sessions: number
  }
  this_month: {
    total_queries: number
    total_tokens: number
    token_input: number
    token_output: number
    unique_sessions: number
    estimated_cost_jpy: number
  }
  limits: {
    daily_user: { limit_value: number }
    monthly_site: {
      limit_value: number
      current_value: number
      percentage: number
    }
  }
}

export interface DailyBreakdown {
  date: string
  queries: number
  tokens: number
}

export interface TopQuery {
  query: string
  count: number
}

export async function getUsageStats(): Promise<UsageStats> {
  const supabase = createAdminClient()

  // Today's stats (JST)
  const { data: todayData } = await supabase.rpc('get_today_usage_stats')

  // This month's stats (JST)
  const { data: monthData } = await supabase.rpc('get_monthly_usage_stats')

  // Limits
  const { data: limits } = await supabase
    .from('ai_usage_limits')
    .select('limit_type, limit_value, current_value')

  const dailyLimit = limits?.find((l) => l.limit_type === 'daily_user')
  const monthlyLimit = limits?.find((l) => l.limit_type === 'monthly_site')

  const todayStats = todayData?.[0] || {
    total_queries: 0,
    token_input: 0,
    token_output: 0,
    unique_sessions: 0,
  }

  const monthStats = monthData?.[0] || {
    total_queries: 0,
    token_input: 0,
    token_output: 0,
    unique_sessions: 0,
  }

  const monthlyCurrentValue = monthlyLimit?.current_value || 0
  const monthlyLimitValue = monthlyLimit?.limit_value || 10000

  return {
    today: {
      total_queries: todayStats.total_queries,
      total_tokens: todayStats.token_input + todayStats.token_output,
      token_input: todayStats.token_input,
      token_output: todayStats.token_output,
      unique_sessions: todayStats.unique_sessions,
    },
    this_month: {
      total_queries: monthStats.total_queries,
      total_tokens: monthStats.token_input + monthStats.token_output,
      token_input: monthStats.token_input,
      token_output: monthStats.token_output,
      unique_sessions: monthStats.unique_sessions,
      estimated_cost_jpy: estimateCostJPY(
        monthStats.token_input,
        monthStats.token_output
      ),
    },
    limits: {
      daily_user: { limit_value: dailyLimit?.limit_value || 30 },
      monthly_site: {
        limit_value: monthlyLimitValue,
        current_value: monthlyCurrentValue,
        percentage:
          monthlyLimitValue > 0
            ? Math.round((monthlyCurrentValue / monthlyLimitValue) * 1000) / 10
            : 0,
      },
    },
  }
}

export async function getDailyBreakdown(): Promise<DailyBreakdown[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_daily_usage_breakdown')

  if (error) {
    console.error('Daily breakdown error:', error)
    return []
  }

  return (data || []).map(
    (row: { date: string; queries: number; tokens: number }) => ({
      date: row.date,
      queries: row.queries,
      tokens: row.tokens,
    })
  )
}

export async function getTopQueries(limit = 10): Promise<TopQuery[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_top_queries', {
    p_limit: limit,
  })

  if (error) {
    console.error('Top queries error:', error)
    return []
  }

  return (data || []).map((row: { query: string; count: number }) => ({
    query: row.query,
    count: row.count,
  }))
}

export async function updateLimit(
  limitType: 'daily_user' | 'monthly_site',
  value: number
) {
  const supabase = createAdminClient()

  if (value < 1) {
    return { success: false, error: '制限値は1以上を指定してください' }
  }

  const { error } = await supabase
    .from('ai_usage_limits')
    .update({ limit_value: value, updated_at: new Date().toISOString() })
    .eq('limit_type', limitType)

  if (error) {
    console.error('Limit update error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/analytics')

  return { success: true }
}
