import { createClient } from '@supabase/supabase-js'

// Server-side only — never import this in client components.
export function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }
  // Pass cache: 'no-store' so Next.js never caches Supabase REST calls.
  return createClient(url, key, {
    global: {
      fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}
