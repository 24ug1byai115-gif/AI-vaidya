# Evaluation metrics (recommended)

| Metric | What it measures | How to run (sketch) |
| --- | --- | --- |
| **Citation precision** | Fraction of claims with a supporting chunk span | Human audit on N QA pairs |
| **Citation recall** | Ground-truth passages recovered in top-k | Label chunk IDs for gold questions |
| **Faithfulness** | Answer contradictions vs retrieved set | LLM-as-judge + human spot checks |
| **Sanskrit copy accuracy** | Devanagari substring ∈ ∪ chunks | Script-aware string match |
| **Abstention quality** | Correct “not found” when no gold | Negative queries with empty retrieval |
| **Latency p95** | End-to-end `/api/chat` | `hey` / `k6` / `locust` against deployed API |
| **Ingest throughput** | Pages/sec for 400+ page corpora | Batch ingest logs |

## Offline embedder sanity

- Compare `multilingual-e5-base` vs `e5-large` on a held-out query set with nDCG@k on labeled relevance.

## OCR regression

- Maintain a small set of scanned pages with known ground text; track CER/WER after denoise heuristics.
