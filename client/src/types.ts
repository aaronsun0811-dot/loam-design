export type SpaceId = "writing" | "projects" | "reading" | "research" | "life";

export type AssetKind = "text" | "image" | "video" | "prompt";

export type AiTaskKind = "summary" | "polish" | "brainstorm" | "image" | "video";

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  spaceId: SpaceId;
  updatedAt: string;
  links: string[];
  backlinks: string[];
  assetIds: string[];
}

export interface LoamAsset {
  id: string;
  kind: AssetKind;
  title: string;
  noteId: string;
  prompt?: string;
  uri?: string;
  createdAt: string;
}

export interface AiTask {
  id: string;
  kind: AiTaskKind;
  noteId: string;
  label: string;
  status: "queued" | "running" | "done" | "failed";
  output?: string;
}

export interface ModelRoute {
  kind: "text" | "image" | "video";
  provider: string;
  model: string;
  enabled: boolean;
}

export interface LoamState {
  activeNoteId: string;
  activeSpaceId: SpaceId;
  activePanel: "api" | "skill" | "resources" | "models";
  route: AppRoute;
  notes: Note[];
  assets: LoamAsset[];
  tasks: AiTask[];
  routes: ModelRoute[];
}

export type AppRoute =
  | { kind: "note"; noteId: string }
  | { kind: "page"; page: "home" | "graph" | "all-notes" | "inbox" | "daily" | "images" | "videos" | "skills" | "providers" | "templates" | "settings" }
  | { kind: "space"; spaceId: SpaceId }
  | { kind: "tag"; tag: string }
  | { kind: "detail"; detailKind: string; title: string };
