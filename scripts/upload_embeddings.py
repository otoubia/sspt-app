"""
Upload the top 50 000 Word2Vec (Google News 300-dim) embeddings to Supabase.

Prerequisites
-------------
  pip install gensim supabase python-dotenv

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in sspt-app/.env.local
(or export them as environment variables before running this script).

Run from the sspt-app directory:
  python scripts/upload_embeddings.py
"""

import os
import sys
import time

# ── Load env from .env.local if present ──────────────────────────────────────

try:
    from dotenv import load_dotenv
    load_dotenv(".env.local")
except ImportError:
    pass  # dotenv optional; env vars may already be set

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
        "in .env.local or as environment variables."
    )

TARGET = 50_000   # number of words to upload
BATCH  = 100      # rows per Supabase REST call

# ── Filter: keep only plain lowercase English words ──────────────────────────

def is_valid(word: str) -> bool:
    return (
        word.isalpha()           # letters only (no digits, underscores, hyphens)
        and word.islower()       # lowercase (excludes proper nouns stored in Title Case)
        and 3 <= len(word) <= 15 # reasonable length
    )

# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print("Loading word2vec-google-news-300 (first run downloads ~1.6 GB)…")
    import gensim.downloader as api
    model = api.load("word2vec-google-news-300")
    print("Model loaded.")

    # Words in model.key_to_index are ordered by descending frequency.
    vocab = [w for w in model.key_to_index if is_valid(w)][:TARGET]
    print(f"Filtered to {len(vocab)} valid words (target {TARGET}).")

    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"Uploading in batches of {BATCH}…")
    t0 = time.time()

    for i in range(0, len(vocab), BATCH):
        batch = vocab[i : i + BATCH]
        rows  = [{"word": w, "embedding": model[w].tolist()} for w in batch]
        client.table("word_embeddings").upsert(rows).execute()

        done = i + len(batch)
        if done % 2000 == 0 or done == len(vocab):
            elapsed = time.time() - t0
            print(f"  {done}/{len(vocab)} words  ({elapsed:.0f}s elapsed)")

    print(f"Done! Uploaded {len(vocab)} word embeddings in {time.time()-t0:.0f}s.")


if __name__ == "__main__":
    main()
