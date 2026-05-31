# Loam Client

This is the Tauri-ready client scaffold for Loam.

## Commands

```bash
npm install
npm run dev
npm run build
npm run tauri:dev
```

`npm run build` verifies the TypeScript/Vite frontend. `npm run tauri:dev` requires Rust/Cargo on the machine.

## Current Shape

- Vanilla TypeScript app shell for maximum startup speed.
- Local state model for notes, assets, AI tasks, and model routes.
- Vault adapter interface prepared for Tauri filesystem commands.
- AI router separated from UI so providers can be added without touching screens.

## Next Client Step

Implement Tauri commands for:

- opening a vault folder
- reading Markdown notes
- saving Markdown notes
- building the SQLite index
- writing generated assets into `assets/`
