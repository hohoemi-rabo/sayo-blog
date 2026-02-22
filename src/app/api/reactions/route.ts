import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get('postId')
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('reactions')
      .select('reaction_type, count')
      .eq('post_id', postId)

    if (error) {
      console.error('Error fetching reactions:', error)
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
    }

    const counts: Record<string, number> = {}
    data?.forEach((r) => {
      counts[r.reaction_type] = r.count
    })

    return NextResponse.json(counts)
  } catch (error) {
    console.error('Reactions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { post_id, reaction_type } = await request.json()

    if (!post_id || !reaction_type) {
      return NextResponse.json(
        { error: 'post_id and reaction_type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['light', 'heart', 'thumbs', 'fire']
    if (!validTypes.includes(reaction_type)) {
      return NextResponse.json({ error: 'Invalid reaction_type' }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase.rpc('increment_reaction_count', {
      p_post_id: post_id,
      p_reaction_type: reaction_type,
    })

    if (error) {
      console.error('Error incrementing reaction:', error)
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: data })
  } catch (error) {
    console.error('Reactions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
