import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { contentType } from "./paths.js";
import { packageRoot } from "./root.js";
import type { Service } from "./service.js";
import { PackError } from "./types.js";

export type ListenOptions = {
  host: string;
  port: number;
};

export async function startServer(
  service: Service,
  options: ListenOptions,
): Promise<{ url: string; close: () => Promise<void> }> {
  const webRoot = path.join(packageRoot(), "web");
  const server = http.createServer(async (req, res) => {
    try {
      await handle(service, webRoot, req, res);
    } catch (error) {
      const status = error instanceof PackError ? error.status : 500;
      const message = error instanceof Error ? error.message : "服务器错误";
      sendJson(res, status, { error: message });
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  const url = `http://${options.host}:${port}`;
  return {
    url,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function handle(
  service: Service,
  webRoot: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const method = req.method || "GET";

  if (url.pathname === "/api/state" && method === "GET") {
    sendJson(res, 200, service.getState());
    return;
  }
  if (url.pathname === "/api/refresh" && method === "POST") {
    sendJson(res, 200, service.refresh());
    return;
  }
  if (url.pathname === "/api/settings" && method === "PUT") {
    const body = await readJson(req);
    sendJson(res, 200, service.updateSettings(asObject(body)));
    return;
  }
  if (url.pathname === "/api/import" && method === "POST") {
    const body = asObject(await readJson(req));
    sendJson(res, 200, service.importPack(String(body.path ?? "")));
    return;
  }

  const packRoute = url.pathname.match(/^\/api\/packs\/([^/]+)(?:\/([^/]+))?$/);
  if (packRoute) {
    const name = decodeURIComponent(packRoute[1]);
    const action = packRoute[2];
    if (!action && method === "GET") {
      sendJson(res, 200, service.requirePack(name));
      return;
    }
    if (action === "file" && method === "GET") {
      const rel = url.searchParams.get("path") || "";
      sendJson(res, 200, service.readFile(name, rel));
      return;
    }
    if (action === "file" && method === "PUT") {
      const body = asObject(await readJson(req));
      const rel = String(body.path ?? "");
      const content = body.content;
      if (typeof content !== "string") throw new PackError("content 必须是字符串");
      sendJson(res, 200, service.writeFile(name, rel, content));
      return;
    }
    if (action === "regenerate" && method === "POST") {
      const body = asObject(await readJson(req));
      const scope = typeof body.scope === "string" ? body.scope : "all";
      sendJson(res, 200, await service.regenerate(name, scope));
      return;
    }
    if (action === "validate" && method === "POST") {
      sendJson(res, 200, service.validate(name));
      return;
    }
    if (action === "reveal" && method === "POST") {
      const body = asObject(await readJson(req));
      const rel = typeof body.path === "string" && body.path ? body.path : undefined;
      sendJson(res, 200, service.reveal(name, rel));
      return;
    }
    throw new PackError("未知接口", 404);
  }

  const preview = url.pathname.match(/^\/preview\/([^/]+)\/(.+)$/);
  if (preview && method === "GET") {
    const name = decodeURIComponent(preview[1]);
    const rel = preview[2]
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
    const located = service.resolvePreview(name, rel);
    res.writeHead(200, {
      "content-type": located.contentType,
      "cache-control": "no-store",
    });
    fs.createReadStream(located.file).pipe(res);
    return;
  }

  if (method === "GET") {
    const served = serveWeb(webRoot, url.pathname);
    if (served) {
      res.writeHead(200, { "content-type": served.type, "cache-control": "no-cache" });
      res.end(served.body);
      return;
    }
  }
  throw new PackError("未找到", 404);
}

function serveWeb(webRoot: string, pathname: string): { type: string; body: Buffer } | null {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  if (rel.includes("..") || path.isAbsolute(rel)) return null;
  const file = path.resolve(webRoot, rel);
  if (!file.startsWith(webRoot + path.sep) && file !== path.join(webRoot, "index.html")) return null;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const type = contentType(file) ?? (rel.endsWith(".html") ? "text/html; charset=utf-8" : null);
  if (!type) return null;
  return { type, body: fs.readFileSync(file) };
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buf.length;
    if (size > 2_000_000) throw new PackError("请求体过大");
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new PackError("请求体不是 JSON");
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PackError("请求体必须是 JSON 对象");
  return value as Record<string, unknown>;
}
