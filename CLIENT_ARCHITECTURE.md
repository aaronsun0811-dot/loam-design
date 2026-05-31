# Loam Client Architecture

Loam should ship as a fast local-first desktop client. Use Tauri first, Electron only if a future plugin ecosystem needs deeper Chromium APIs.

## Recommended Stack

- Shell: Tauri
- UI: React + TypeScript
- Editor: CodeMirror 6
- Local index: SQLite
- File storage: Markdown vault on disk
- Search: SQLite FTS5 first, Tantivy later if the vault grows large
- Graph: derived from `[[links]]`, tags, frontmatter, and generated assets

## Core Modules

- `vault`: open folder, read/write Markdown, watch file changes
- `indexer`: parse notes, links, tags, frontmatter, and asset metadata
- `editor`: CodeMirror document state, preview, backlinks, command palette
- `ai`: provider adapters for text/image/video models
- `assets`: save generated images, prompts, scripts, and video outputs beside notes
- `router`: choose model by task type, cost, latency, and user preference

## Performance Rules

- Keep UI state in memory and persist in small batches.
- Use event delegation for large lists and graph nodes.
- Search against an index, not raw file scans.
- Generate graph data incrementally after file changes.
- Never block typing with AI calls, indexing, or asset generation.
- Load large assets lazily and keep thumbnails separate from originals.

## Local Data Shape

```text
Vault/
  notes/
    how-to-build-a-second-brain.md
  assets/
    images/
    videos/
    prompts/
  .loam/
    index.sqlite
    settings.json
    model-providers.json
```

## First Client Milestone

1. Open a vault folder.
2. Edit and save Markdown.
3. Parse `[[links]]`, tags, and backlinks.
4. Run text AI actions on selected text.
5. Save generated outputs into the current note.
6. Package with Tauri for macOS.
