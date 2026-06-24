import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shortest Semantic Path Task</h1>
          <p className="mt-2 text-gray-500">How efficiently can you navigate between words?</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left text-sm text-gray-600 space-y-3">
          <p className="font-semibold text-gray-800">How to play</p>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              You're given two random words — a start and an end.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              Fill in 3 intermediate words so that each word is as closely related as possible to the word before it.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              The app scores your <strong>circuitousness</strong>: the ratio of your path length to the shortest possible ordering of your 3 words.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">4.</span>
              A score of <strong>1.00</strong> means your ordering was already optimal!
            </li>
          </ul>
        </div>

        <Link
          href="/session"
          className="block w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Start Session
        </Link>
      </div>

      <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400 px-4">
        Based on:{' '}
        <a
          href="https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0352328&?utm_id=plos111&utm_source=internal&utm_medium=email&utm_campaign=author"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600 transition-colors"
        >
          Toubia O, Berger J (2026) Optimally sequencing semantic search predicts creativity. <em>PLoS One</em> 21(6): e0352328.
        </a>
      </p>
    </main>
  )
}
