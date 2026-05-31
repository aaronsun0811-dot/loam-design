import type { Note } from "./types";

export interface VaultAdapter {
  open(): Promise<void>;
  listNotes(): Promise<Note[]>;
  saveNote(note: Note): Promise<void>;
}

export class BrowserPreviewVault implements VaultAdapter {
  async open(): Promise<void> {
    return Promise.resolve();
  }

  async listNotes(): Promise<Note[]> {
    return Promise.resolve([]);
  }

  async saveNote(_note: Note): Promise<void> {
    return Promise.resolve();
  }
}
