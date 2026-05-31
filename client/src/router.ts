import type { AppRoute, SpaceId } from "./types";

export function routeToHash(route: AppRoute): string {
  if (route.kind === "note") return `#note/${encode(route.noteId)}`;
  if (route.kind === "page") return `#page/${route.page}`;
  if (route.kind === "space") return `#space/${route.spaceId}`;
  if (route.kind === "tag") return `#tag/${encode(route.tag)}`;
  return `#detail/${encode(route.detailKind)}/${encode(route.title)}`;
}

export function hashToRoute(hash: string): AppRoute {
  const [kind, first = "", second = ""] = hash.replace(/^#/, "").split("/");
  if (kind === "page") return { kind: "page", page: pageName(first) };
  if (kind === "space") return { kind: "space", spaceId: spaceId(first) };
  if (kind === "tag") return { kind: "tag", tag: decode(first) };
  if (kind === "detail") return { kind: "detail", detailKind: decode(first), title: decode(second) };
  return { kind: "note", noteId: decode(first) || "second-brain" };
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function decode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function pageName(value: string): Extract<AppRoute, { kind: "page" }>["page"] {
  const allowed = ["home", "graph", "all-notes", "inbox", "daily", "images", "videos", "skills", "providers", "templates", "settings"] as const;
  return allowed.includes(value as (typeof allowed)[number]) ? (value as (typeof allowed)[number]) : "home";
}

function spaceId(value: string): SpaceId {
  const allowed = ["writing", "projects", "reading", "research", "life"] as const;
  return allowed.includes(value as SpaceId) ? (value as SpaceId) : "writing";
}
