import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Validate URL format
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL and Anon Key must be set in environment variables')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel project settings')
  console.error('Current values:', {
    url: supabaseUrl ? 'Set (but may be invalid)' : 'NOT SET',
    key: supabaseAnonKey ? 'Set' : 'NOT SET'
  })
} else if (!isValidUrl(supabaseUrl)) {
  console.error('❌ Invalid Supabase URL format')
  console.error('URL must start with http:// or https://')
  console.error('Current URL value:', supabaseUrl ? `"${supabaseUrl}"` : '(empty)')
}

// Only create client if we have valid credentials
let supabase: ReturnType<typeof createClient>

if (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Create a dummy client to prevent crashes, but it won't work
  // The app will show an error message
  console.warn('⚠️ Creating placeholder Supabase client - app will not function correctly')
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
}

export { supabase }

