# Loam

Loam is a local-first writing and knowledge workspace prototype inspired by Obsidian. It includes notes, folders, backlinks, block-level relations, canvas, AI chat routing, skill presets, generated images, import/export, and a Tauri-ready client scaffold.

## Open The Prototype

Open `index.html` directly in a browser:

```bash
open index.html
```

## Local API Proxy

The static prototype uses `api-proxy.mjs` for local clipboard, terminal, and provider API proxy calls:

```bash
node api-proxy.mjs
```

The proxy listens on `http://127.0.0.1:8787`.

## Client Scaffold

The desktop client scaffold lives in `client/`.

```bash
cd client
npm install
npm run build
npm run tauri:dev
```

`npm run tauri:dev` requires Rust/Cargo and Tauri prerequisites.

## Notes

- API keys are stored locally by the app at runtime and are not committed.
- `node_modules`, logs, build output, and local environment files are ignored.
- The current skill market is a local preset library, not an external plugin marketplace.
