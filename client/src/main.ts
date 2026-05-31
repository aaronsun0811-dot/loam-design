import { previewOutput, routeForTask } from "./ai-router";
import { hashToRoute, routeToHash } from "./router";
import { activeNote, enqueueAiTask, initialState } from "./state";
import type { AiTaskKind, LoamState } from "./types";

let state: LoamState = initialState;
state = { ...state, route: hashToRoute(window.location.hash) };

function render(): void {
  const note = activeNote(state);
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;

  app.replaceChildren();

  const main = document.createElement("main");
  main.style.cssText = "font-family: system-ui; min-height: 100vh; background: #0d1113; color: #eef4f1; padding: 24px;";

  const section = document.createElement("section");
  section.style.cssText = "max-width: 880px; margin: 0 auto;";

  const h1 = document.createElement("h1");
  h1.style.cssText = "margin: 0 0 8px;";
  h1.textContent = "Loam Client Shell";

  const subtitle = document.createElement("p");
  subtitle.style.cssText = "color: #9aa7a3;";
  subtitle.textContent = "Tauri-ready local-first client scaffold.";

  if (!note) {
    const empty = document.createElement("p");
    empty.style.cssText = "color: #9aa7a3; margin-top: 20px;";
    empty.textContent = "暂无笔记。打开一个 vault 开始记录。";
    section.append(h1, subtitle, empty);
    main.append(section);
    app.append(main);
    return;
  }

  const article = document.createElement("article");
  article.style.cssText = "border: 1px solid rgba(221,231,235,.12); border-radius: 8px; padding: 16px; margin-top: 20px;";

  const title = document.createElement("h2");
  title.style.cssText = "margin: 0 0 12px;";
  title.textContent = note.title;

  const route = document.createElement("p");
  route.style.cssText = "color: #9aa7a3;";
  route.textContent = `Route: ${routeToHash(state.route)}`;

  const body = document.createElement("p");
  body.style.cssText = "line-height: 1.7;";
  body.textContent = note.body;

  const buttons = [
    { kind: "summary", label: "生成摘要" },
    { kind: "polish", label: "润色" },
    { kind: "image", label: "生图 Prompt" },
    { kind: "video", label: "视频脚本" },
  ] as const;
  const actions = buttons.map(({ kind, label }) => {
    const button = document.createElement("button");
    button.dataset.ai = kind;
    button.textContent = label;
    return button;
  });

  const output = document.createElement("pre");
  output.id = "output";
  output.style.cssText = "white-space: pre-wrap; margin-top: 16px; color: #c5cfcb;";

  article.append(title, route, body, ...actions);
  section.append(h1, subtitle, article, output);
  main.append(section);
  app.append(main);
}

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-ai]");
  if (!button) return;

  const kind = button.dataset.ai as AiTaskKind;
  state = enqueueAiTask(state, kind);
  render();
  try {
    const route = routeForTask(state, kind);
    const output = document.querySelector<HTMLPreElement>("#output");
    if (output) output.textContent = `${route.provider} / ${route.model}\n\n${previewOutput(kind)}`;
  } catch (error) {
    const output = document.querySelector<HTMLPreElement>("#output");
    if (output) output.textContent = error instanceof Error ? error.message : String(error);
  }
});

window.addEventListener("hashchange", () => {
  state = { ...state, route: hashToRoute(window.location.hash) };
  render();
});

render();
