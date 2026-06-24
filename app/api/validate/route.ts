import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const word = typeof body.word === 'string' ? body.word.trim().toLowerCase() : ''

  if (!word) {
    return NextResponse.json({ valid: false })
  }

  const supabase = getSupabase()
  const { data } = await supabase
    .from('word_embeddings')
    .select('word')
    .eq('word', word)
    .maybeSingle()

  return NextResponse.json({ valid: data !== null })
}
