import fs from "node:fs";
import path from "node:path";
import { PackError } from "./types.js";

const WRITE_ROOT_FILES = new Set(["pack.json", "README.md", "README", "FEATURE_MAP.md", "STYLE_GUIDE.md"]);

export function normalizeRel(rel: string): string {
  if (typeof rel !== "string" || !rel.trim()) throw new PackError("缺少路径");
  if (rel.includes("\0") || rel.includes("\\")) throw new PackError("非法路径");
  const cleaned = rel.trim().replace(/^\.\//, "");
  if (path.isAbsolute(cleaned)) throw new PackError("需要包内相对路径");
  const parts = cleaned.split("/");
  if (parts.some((part) => part === "" || part === "." || part === ".." || part.startsWith("."))) {
    throw new PackError("非法路径");
  }
  return parts.join("/");
}

export function assertInside(root: string, candidate: string): void {
  const rel = path.relative(root, candidate);
  if (rel === "" || rel === ".") return;
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new PackError("路径超出包目录");
}

/** Resolve a relative pack path and refuse symlink escapes. */
export function resolveInside(root: string, rel: string): string {
  const norm = normalizeRel(rel);
  const rootReal = fs.realpathSync(root);
  const lexical = path.resolve(rootReal, norm);
  assertInside(rootReal, lexical);
  if (fs.existsSync(lexical)) {
    const real = fs.realpathSync(lexical);
    assertInside(rootReal, real);
    return real;
  }
  const parent = path.dirname(lexical);
  if (fs.existsSync(parent)) {
    const parentReal = fs.realpathSync(parent);
    assertInside(rootReal, parentReal);
    return path.join(parentReal, path.basename(lexical));
  }
  return lexical;
}

export function assertWritable(rel: string): string {
  const norm = normalizeRel(rel);
  if (WRITE_ROOT_FILES.has(norm)) return norm;
  if (/^(light|dark)\/.+\.html$/i.test(norm)) return norm;
  if (/^tools\/.+\.(py|js|mjs|md|json)$/i.test(norm)) return norm;
  throw new PackError("只能写入 pack.json、Markdown 文档、主题 HTML 或 tools/ 脚本");
}

const PREVIEW_EXT = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".txt",
  ".py",
]);

export function contentType(file: string): string | null {
  const ext = path.extname(file).toLowerCase();
  if (!PREVIEW_EXT.has(ext)) return null;
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "text/plain; charset=utf-8";
  }
}

export function fileKind(rel: string): "html" | "markdown" | "json" | "python" | "text" {
  const ext = path.extname(rel).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".md" || rel === "README") return "markdown";
  if (ext === ".json") return "json";
  if (ext === ".py") return "python";
  return "text";
}
