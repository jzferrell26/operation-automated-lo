# 04 - Embeddings: semantic memory search

Embeddings turn the keyword grep over `summaries/` into hybrid lexical + semantic search, so paraphrases and synonyms match. Opt-in, persisted in `~/.deeplake/config.json` under `embeddings.enabled`.

```bash
hivemind embeddings install   # download @huggingface/transformers once (~600 MB) into a shared
                              # dir, symlink every detected agent plugin to it, and set
                              # embeddings.enabled = true. Idempotent.
hivemind embeddings enable    # light opt-in: flip embeddings.enabled = true (use after disable
                              # to turn back on without re-running install)
hivemind embeddings disable   # light opt-out: flip enabled = false and SIGTERM the daemon;
                              # shared deps stay on disk
hivemind embeddings uninstall [--prune]   # full opt-out: remove per-agent symlinks, flip
                              # enabled = false; --prune also wipes the ~600 MB deps
hivemind embeddings status    # show config + deps + per-agent link state
```

## When to recommend it

- Recommend `embeddings install` when the user complains that memory recall misses obvious matches, or when summaries have grown large enough that exact-keyword grep is brittle.
- The ~600 MB download is one-time and shared across all agents, so the cost is paid once per machine.
- After a `disable`, use `enable` (not `install`) to turn it back on; the deps are already on disk.

## Footgun

`embeddings uninstall --prune` deletes the ~600 MB model deps. It is state-changing and slow to redo (re-download). Confirm with the user before pruning.
