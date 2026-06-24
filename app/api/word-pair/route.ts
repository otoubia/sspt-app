import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabase()

  // get_random_words is a SQL function defined in supabase/schema.sql
  const { data, error } = await supabase.rpc('get_random_words', { n: 2 })

  if (error || !Array.isArray(data) || data.length < 2) {
    console.error('word-pair error:', error)
    return NextResponse.json({ error: 'Failed to fetch word pair' }, { status: 500 })
  }

  return NextResponse.json({ word1: data[0] as string, word5: data[1] as string })
}
