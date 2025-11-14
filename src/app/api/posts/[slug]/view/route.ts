import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createClient()

    // Increment view count
    const { data, error } = await supabase.rpc('increment_post_view_count', {
      post_slug: slug,
    })

    if (error) {
      console.error('Error incrementing view count:', error)
      return NextResponse.json({ error: 'Failed to increment view count' }, { status: 500 })
    }

    return NextResponse.json({ success: true, viewCount: data })
  } catch (error) {
    console.error('View count API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
