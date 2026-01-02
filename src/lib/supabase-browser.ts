import { createClient } from '@supabase/supabase-js'

// Singleton Supabase client for browser/client components
let supabaseBrowser: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowser() {
  if (!supabaseBrowser) {
    supabaseBrowser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }
  return supabaseBrowser
}
