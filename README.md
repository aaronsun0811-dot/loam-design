# Loam

Loam is a local-first writing and knowledge workspace prototype inspired by Obsidian. It includes notes, folders, backlinks, block-level relations, canvas, AI chat routing, skill presets, generated images, import/export, and a Tauri desktop client.

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

## Desktop Client

The desktop client lives in `client/`. It packages the full Loam prototype into a macOS app.

```bash
cd client
npm install
npm run build
npm run tauri:dev
```

Build a local release package:

```bash
cd client
npm run build
npm run tauri:build
npm run package:mac
```

The packaged app is written to `client/release/Loam.app`, and the uploadable zip is written to `client/release/Loam-0.1.0-mac-arm64.zip`.

`npm run tauri:dev` and `npm run tauri:build` require Rust/Cargo and Tauri prerequisites.

## Opening The Downloaded Mac App

The GitHub build is not Apple notarized yet, so macOS Gatekeeper may block it after download.

Try this first:

1. Unzip `Loam-0.1.0-mac-arm64.zip`.
2. Right-click `Loam.app`.
3. Choose `Open`, then confirm `Open`.

If macOS still blocks it, remove the download quarantine flag:

```bash
sudo xattr -r -d com.apple.quarantine /path/to/Loam.app
```

Tip: type `sudo xattr -r -d com.apple.quarantine ` in Terminal, keep the trailing space, then drag `Loam.app` from Finder into Terminal and press Return.

Do not use `sudo spctl --master-disable` as the normal install path. It weakens system-wide Gatekeeper protection and is not needed for ordinary Loam testing.

## Notes

- API keys are stored locally by the app at runtime and are not committed.
- `node_modules`, logs, build output, and local environment files are ignored.
- The current skill market is a local preset library, not an external plugin marketplace.
