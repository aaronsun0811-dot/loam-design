import type { AiTaskKind, LoamState, Note } from "./types";

export const initialState: LoamState = {
  activeNoteId: "second-brain",
  activeSpaceId: "writing",
  activePanel: "api",
  route: { kind: "note", noteId: "second-brain" },
  notes: [
    {
      id: "second-brain",
      title: "如何构建第二大脑",
      body: "构建第二大脑，不是为了记住更多，而是为了更好地思考、连接和创造。",
      tags: ["方法论", "知识管理"],
      spaceId: "writing",
      updatedAt: "2026-05-06",
      links: ["card-box", "para"],
      backlinks: ["loam-launch"],
      assetIds: ["cover-prompt"],
    },
  ],
  assets: [
    {
      id: "cover-prompt",
      kind: "prompt",
      title: "第二大脑封面 Prompt",
      noteId: "second-brain",
      createdAt: "2026-05-06",
      prompt: "暗色写作工作台，绿色光标穿过知识图谱，笔记节点像种子一样发芽。",
    },
  ],
  tasks: [],
  routes: [
    { kind: "text", provider: "OpenAI / Anthropic", model: "fast text route", enabled: true },
    { kind: "image", provider: "Flux / OpenAI", model: "cover image route", enabled: true },
    { kind: "video", provider: "Kling / Runway", model: "storyboard route", enabled: true },
  ],
};

export function selectNote(state: LoamState, noteId: string): LoamState {
  if (!state.notes.some((note) => note.id === noteId)) return state;
  return { ...state, activeNoteId: noteId, route: { kind: "note", noteId } };
}

export function activeNote(state: LoamState): Note | undefined {
  return state.notes.find((note) => note.id === state.activeNoteId) ?? state.notes[0];
}

export function enqueueAiTask(state: LoamState, kind: AiTaskKind): LoamState {
  const note = activeNote(state);
  if (!note) return state;
  const task = {
    id: `${kind}-${Date.now()}`,
    kind,
    noteId: note.id,
    label: taskLabel(kind),
    status: "running" as const,
  };
  return { ...state, tasks: [task, ...state.tasks] };
}

function taskLabel(kind: AiTaskKind): string {
  const labels: Record<AiTaskKind, string> = {
    summary: "生成摘要",
    polish: "润色当前段落",
    brainstorm: "头脑风暴",
    image: "生成封面 Prompt",
    video: "生成短视频脚本",
  };
  return labels[kind];
}
