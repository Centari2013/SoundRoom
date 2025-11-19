import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[admin-ingest] Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY locally.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
