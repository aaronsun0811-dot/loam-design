import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const host = process.env.LOAM_API_PROXY_HOST || "127.0.0.1";
const port = Number(process.env.LOAM_API_PROXY_PORT || 8787);
const timeoutMs = Number(process.env.LOAM_API_PROXY_TIMEOUT_MS || 120000);
const terminalTimeoutMs = Number(process.env.LOAM_TERMINAL_TIMEOUT_MS || 30000);
const terminalRoot = path.resolve(process.env.LOAM_TERMINAL_ROOT || "/Users/seek/Documents");

function isLoopbackAddress(address = "") {
  const value = String(address || "");
  return value === "127.0.0.1" || value === "::1" || value === "::ffff:127.0.0.1";
}

function corsOriginForRequest(request) {
  const origin = String(request?.headers?.origin || "");
  if (!origin) return "";
  if (origin === "null") return "null"; // file:// origins in browsers
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) return origin;
  return "";
}

function assertTrustedRequester(request) {
  const remoteAddress = request?.socket?.remoteAddress || "";
  if (!isLoopbackAddress(remoteAddress)) {
    const error = new Error("只允许本机访问 Loam API Proxy");
    error.statusCode = 403;
    throw error;
  }
  const origin = String(request?.headers?.origin || "");
  if (origin && !corsOriginForRequest(request)) {
    const error = new Error("浏览器 Origin 不受信任：只允许 file:// 或 localhost 页面访问");
    error.statusCode = 403;
    throw error;
  }
}

function buildCorsHeaders(request, extra = {}) {
  const corsOrigin = corsOriginForRequest(request);
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, anthropic-version",
    ...extra,
  };
  if (corsOrigin) headers["Access-Control-Allow-Origin"] = corsOrigin;
  return headers;
}

function sendJson(request, response, status, body) {
  response.writeHead(status, buildCorsHeaders(request, { "Content-Type": "application/json; charset=utf-8" }));
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on("data", (chunk) => {
      chunks.push(chunk);
      length += chunk.length;
      if (length > 2_000_000) {
        reject(new Error("请求体过大"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function assertAllowedEndpoint(endpoint) {
  const url = new URL(endpoint);
  const localHost = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (url.protocol === "https:") return endpoint;
  if (url.protocol === "http:" && localHost) return endpoint;
  throw new Error("只允许请求 HTTPS 供应商接口，或本机 HTTP 模型服务");
}

function readSystemClipboard() {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/pbpaste", { encoding: "utf8", env: utf8ProcessEnv(), maxBuffer: 10_000_000 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout || "");
    });
  });
}

function utf8ProcessEnv() {
  return {
    ...process.env,
    LANG: process.env.LANG || "en_US.UTF-8",
    LC_CTYPE: process.env.LC_CTYPE || "UTF-8",
  };
}

function writeSystemClipboard(text) {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/pbcopy", { env: utf8ProcessEnv() });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`pbcopy exited with code ${code}`));
    });
    child.stdin.end(String(text || ""));
  });
}

function normalizeTerminalCwd(cwd = "") {
  const resolved = path.resolve(String(cwd || terminalRoot));
  const relative = path.relative(terminalRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`终端目录必须在 ${terminalRoot} 内`);
  }
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    throw new Error(`终端目录不存在：${resolved}`);
  }
  return resolved;
}

function terminalCommandBlockedReason(command = "") {
  const text = String(command || "").trim();
  if (!text) return "请输入命令";
  const blocked = [
    [/sudo\b/, "需要管理员权限的命令先不在 Loam 里直接执行"],
    [/\brm\s+(-[^\n;&|]*[rf][^\n;&|]*|-[^\n;&|]*[fr][^\n;&|]*)\s+\/?/, "高危删除命令已拦截"],
    [/\b(shutdown|reboot|halt|poweroff)\b/, "关机或重启命令已拦截"],
    [/\bdiskutil\s+erase|\bmkfs\b|\bformat\b/i, "磁盘格式化命令已拦截"],
    [/\bdd\s+.*\bof=/, "dd 写盘命令已拦截"],
    [/\b(chmod|chown)\s+-R\s+.*\//, "递归修改系统路径权限已拦截"],
    [/: *\(\) *\{ *: *\| *: *& *\}/, "fork 炸弹已拦截"],
  ];
  const match = blocked.find(([pattern]) => pattern.test(text));
  return match ? match[1] : "";
}

function runTerminalCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const blocked = terminalCommandBlockedReason(command);
    if (blocked) {
      const error = new Error(blocked);
      error.statusCode = 400;
      reject(error);
      return;
    }
    const resolvedCwd = normalizeTerminalCwd(cwd);
    const startedAt = Date.now();
    const child = spawn("/bin/zsh", ["-lc", String(command)], {
      cwd: resolvedCwd,
      env: { ...process.env, TERM: "xterm-256color" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let killed = false;
    const maxOutput = 1_000_000;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
    }, terminalTimeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > maxOutput) stdout = `${stdout.slice(0, maxOutput)}\n...输出过长，已截断...`;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > maxOutput) stderr = `${stderr.slice(0, maxOutput)}\n...错误输出过长，已截断...`;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: !killed && code === 0,
        code: killed ? 124 : Number(code || 0),
        stdout,
        stderr: killed ? `${stderr}\n命令超时，已停止。` : stderr,
        cwd: resolvedCwd,
        elapsedMs: Date.now() - startedAt,
      });
    });
  });
}

function friendlyProxyError(error) {
  const message = error?.message || String(error);
  if (/ByteString|Invalid character|header/i.test(message)) {
    return "请求头包含中文或特殊字符。请检查 API Key，只能粘贴官方 Key，不要填中文说明、空格或整段文字。";
  }
  return message;
}

function normalizeUpstreamHeaders(headers) {
  const output = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(key)) {
      throw new Error(`请求头名称不合法：${key}`);
    }
    const text = String(value ?? "").trim();
    for (const char of text) {
      const code = char.codePointAt(0);
      if (code > 255 || (code < 32 && code !== 9) || code === 127) {
        throw new Error(`${key} 请求头包含中文或特殊字符。请检查 API Key，只能粘贴官方 Key，不要填中文说明。`);
      }
    }
    if (text) output[key] = text;
  }
  return output;
}

async function fetchUpstreamJson({ method, endpoint, headers, payload, timeoutMs: budget }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    const upstream = await fetch(endpoint, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    });
    const raw = await upstream.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }
    return {
      ok: upstream.ok,
      status: upstream.status,
      statusText: upstream.statusText,
      data,
      raw,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function withJsonHandler(request, response, handler) {
  try {
    assertTrustedRequester(request);
    const body = await readBody(request);
    const input = body ? JSON.parse(body) : {};
    const result = await handler(input);
    sendJson(request, response, 200, result);
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    sendJson(request, response, status, { ok: false, proxyError: friendlyProxyError(error) });
  }
}

async function handleClipboard(request, response) {
  try {
    assertTrustedRequester(request);
    if (request.method === "GET") {
      const text = await readSystemClipboard();
      sendJson(request, response, 200, { ok: true, text });
      return;
    }
    if (request.method === "POST") {
      const body = await readBody(request);
      const input = body ? JSON.parse(body) : {};
      const text = String(input.text ?? "");
      await writeSystemClipboard(text);
      const verifiedText = await readSystemClipboard();
      if (verifiedText !== text) {
        throw new Error("系统剪贴板写入后校验失败");
      }
      sendJson(request, response, 200, { ok: true });
      return;
    }
    sendJson(request, response, 405, { ok: false, proxyError: "Method not allowed" });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    sendJson(request, response, status, { ok: false, proxyError: friendlyProxyError(error) });
  }
}

async function handleTerminal(request, response) {
  await withJsonHandler(request, response, async (input) => {
    return runTerminalCommand(input.command || "", input.cwd || terminalRoot);
  });
}

async function handleChat(request, response) {
  await withJsonHandler(request, response, async (input) => {
    const result = await fetchUpstreamJson({
      method: "POST",
      endpoint: assertAllowedEndpoint(String(input.endpoint || "")),
      headers: normalizeUpstreamHeaders(input.headers && typeof input.headers === "object" ? input.headers : {}),
      payload: input.payload && typeof input.payload === "object" ? input.payload : {},
      timeoutMs,
    });
    return { ...result, provider: input.provider || "" };
  });
}

async function handleChatStream(request, response) {
  const controller = new AbortController();
  let idleTimer;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), timeoutMs);
  };
  const onClientClose = () => controller.abort();
  response.on("close", onClientClose);
  try {
    assertTrustedRequester(request);
    const body = await readBody(request);
    const input = body ? JSON.parse(body) : {};
    const endpoint = assertAllowedEndpoint(String(input.endpoint || ""));
    const headers = normalizeUpstreamHeaders(input.headers && typeof input.headers === "object" ? input.headers : {});
    const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
    resetIdleTimer();
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...payload, stream: true }),
      signal: controller.signal,
    });
    response.writeHead(upstream.ok ? 200 : upstream.status, buildCorsHeaders(request, {
      "Content-Type": upstream.headers.get("content-type") || "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    }));
    if (!upstream.ok) {
      const raw = await upstream.text();
      response.write(`event: error\ndata: ${JSON.stringify({ status: upstream.status, statusText: upstream.statusText, raw })}\n\n`);
      response.end();
      return;
    }
    if (!upstream.body) {
      response.end();
      return;
    }
    try {
      for await (const chunk of upstream.body) {
        resetIdleTimer();
        if (!response.write(chunk)) {
          await new Promise((resolve) => response.once("drain", resolve));
        }
      }
      response.end();
    } catch (streamError) {
      if (!response.writableEnded) {
        response.write(`event: error\ndata: ${JSON.stringify({ proxyError: friendlyProxyError(streamError) })}\n\n`);
        response.end();
      }
    }
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    if (!response.headersSent) {
      response.writeHead(status, buildCorsHeaders(request, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      }));
    }
    if (!response.writableEnded) {
      response.write(`event: error\ndata: ${JSON.stringify({ proxyError: friendlyProxyError(error) })}\n\n`);
      response.end();
    }
  } finally {
    clearTimeout(idleTimer);
    response.off("close", onClientClose);
  }
}

async function handleTest(request, response) {
  await withJsonHandler(request, response, async (input) => {
    const result = await fetchUpstreamJson({
      method: "GET",
      endpoint: assertAllowedEndpoint(String(input.endpoint || "")),
      headers: normalizeUpstreamHeaders(input.headers && typeof input.headers === "object" ? input.headers : {}),
      payload: undefined,
      timeoutMs: Math.min(timeoutMs, 15000),
    });
    return { ...result, provider: input.provider || "" };
  });
}

const routes = {
  "GET /health": (request, response) => sendJson(request, response, 200, { ok: true, name: "Loam API Proxy" }),
  "POST /api/chat": handleChat,
  "POST /api/chat-stream": handleChatStream,
  "POST /api/test": handleTest,
  "GET /api/clipboard": handleClipboard,
  "POST /api/clipboard": handleClipboard,
  "POST /api/terminal": handleTerminal,
};

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    // Preflight: only respond with CORS headers when origin is trusted.
    try { assertTrustedRequester(request); } catch { response.writeHead(403); response.end(); return; }
    sendJson(request, response, 204, {});
    return;
  }
  let pathname = request.url || "/";
  try {
    pathname = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`).pathname;
  } catch {
    // Fall back to raw URL; route lookup will 404.
  }
  const handler = routes[`${request.method} ${pathname}`];
  if (handler) {
    void handler(request, response);
    return;
  }
  sendJson(request, response, 404, { ok: false, proxyError: "Not found" });
});

server.listen(port, host, () => {
  console.log(`Loam API Proxy listening on http://${host}:${port}`);
});

// Some desktop launchers close idle Node processes aggressively when they have
// no attached terminal. Keep one lightweight timer referenced so the local
// proxy remains available to the file:// prototype.
const keepAlive = setInterval(() => {}, 60_000);

function shutdown(signal) {
  console.log(`Loam API Proxy received ${signal}, shutting down...`);
  clearInterval(keepAlive);
  server.close(() => process.exit(0));
  // Force-exit if server.close hangs on in-flight connections.
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
