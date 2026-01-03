import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { listMediaFiles } from '@/app/(admin)/admin/media/actions'

export async function GET() {
  // Check authentication
  const cookieStore = await cookies()
  const authToken = cookieStore.get('admin_auth')

  if (authToken?.value !== 'authenticated') {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const result = await listMediaFiles()
  return NextResponse.json(result)
}
