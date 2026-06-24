export interface CircuitousnessResult {
  submittedLength: number
  optimalLength: number
  circuitousness: number
  // Indices into the middle-words array [0,1,2] giving the optimal order
  optimalOrdering: [number, number, number]
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

// All 6 permutations of [0, 1, 2]
const PERMS: [number, number, number][] = [
  [0, 1, 2], [0, 2, 1],
  [1, 0, 2], [1, 2, 0],
  [2, 0, 1], [2, 1, 0],
]

/**
 * Compute circuitousness for a 5-word path.
 * embeddings[0] = word1 (fixed start)
 * embeddings[1..3] = words 2,3,4 (user-supplied middle)
 * embeddings[4] = word5 (fixed end)
 *
 * Circuitousness = submitted_path_length / optimal_path_length
 * where optimal is the best of 6 orderings of the 3 middle words.
 * Value of 1.0 means the user's ordering was already optimal.
 */
export function computeCircuitousness(embeddings: number[][]): CircuitousnessResult {
  const [e0, e1, e2, e3, e4] = embeddings
  const middle = [e1, e2, e3]

  const submittedLength =
    euclidean(e0, e1) + euclidean(e1, e2) + euclidean(e2, e3) + euclidean(e3, e4)

  let optimalLength = Infinity
  let optimalOrdering: [number, number, number] = [0, 1, 2]

  for (const perm of PERMS) {
    const m = perm.map(i => middle[i])
    const len =
      euclidean(e0, m[0]) + euclidean(m[0], m[1]) + euclidean(m[1], m[2]) + euclidean(m[2], e4)
    if (len < optimalLength) {
      optimalLength = len
      optimalOrdering = perm
    }
  }

  return {
    submittedLength,
    optimalLength,
    circuitousness: submittedLength / optimalLength,
    optimalOrdering,
  }
}

// pgvector returns embeddings as a string '[0.1,0.2,...]' via the REST API.
export function parseEmbedding(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw as number[]
  if (typeof raw === 'string') return JSON.parse(raw) as number[]
  throw new Error(`Unexpected embedding format: ${typeof raw}`)
}
