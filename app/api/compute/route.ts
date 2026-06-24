import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { computeCircuitousness, parseEmbedding } from '@/lib/circuitousness'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { word1, word5, words } = body as {
    word1: string
    word5: string
    words: [string, string, string]
  }

  if (!word1 || !word5 || !Array.isArray(words) || words.length !== 3) {
    return NextResponse.json({ error: 'Provide word1, word5, and words[3]' }, { status: 400 })
  }

  const allWords = [word1, ...words, word5].map(w => w.trim().toLowerCase())

  if (new Set(allWords).size !== 5) {
    return NextResponse.json({ error: 'All five words must be distinct.' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('word_embeddings')
    .select('word, embedding')
    .in('word', allWords)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const embMap = new Map<string, number[]>()
  for (const row of data ?? []) {
    embMap.set(row.word as string, parseEmbedding(row.embedding))
  }

  const missing = allWords.filter(w => !embMap.has(w))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Words not found in vocabulary: ${missing.join(', ')}` },
      { status: 400 }
    )
  }

  const embeddings = allWords.map(w => embMap.get(w)!)
  const result = computeCircuitousness(embeddings)

  return NextResponse.json(result)
}
