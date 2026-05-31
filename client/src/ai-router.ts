import type { AiTaskKind, LoamState, ModelRoute } from "./types";

export function routeForTask(state: LoamState, kind: AiTaskKind): ModelRoute {
  const routeKind = kind === "image" ? "image" : kind === "video" ? "video" : "text";
  const route = state.routes.find((candidate) => candidate.kind === routeKind && candidate.enabled);
  if (!route) throw new Error(`No enabled model route for ${routeKind}`);
  return route;
}

export function previewOutput(kind: AiTaskKind): string {
  const output: Record<AiTaskKind, string> = {
    summary: "这篇笔记围绕捕捉、整理、连接、输出四个动作，解释第二大脑如何变成创作系统。",
    polish: "第二大脑不是资料仓库，而是一块可以耕种的思想土壤。",
    brainstorm: "可以把 Loam 的叙事落在思想土壤、创作工作台、多模型资产库三个方向。",
    image: "暗色知识工作台，绿色光标穿过双链图谱，笔记节点像种子一样发芽。",
    video: "第一幕捕捉碎片，第二幕连接图谱，第三幕生成文章、封面和短视频。",
  };
  return output[kind];
}
