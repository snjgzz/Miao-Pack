import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { assertWritable, fileKind, normalizeRel, resolveInside } from "./paths.js";
import {
  PackError,
  type FileContent,
  type GeneratorSpec,
  type IndexedPack,
  type Issue,
  type PackDocs,
  type RegenResult,
  type Screen,
  type ThemeName,
} from "./types.js";

const execFileAsync = promisify(execFile);
const MAX_TEXT = 1_500_000;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const ALLOWED_COMMANDS = new Set(["python3", "python", "node"]);
const BLOCKED_ARGS = new Set(["-e", "-c", "--eval", "-p", "--print"]);

export function isPackDir(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  let stat: fs.Stats;
  try {
    stat = fs.statSync(dir);
  } catch {
    return false;
  }
  if (!stat.isDirectory()) return false;
  const hasManifest = fs.existsSync(path.join(dir, "pack.json"));
  const hasReadme = fs.existsSync(path.join(dir, "README.md")) || fs.existsSync(path.join(dir, "README"));
  const hasTheme =
    isDir(path.join(dir, "light")) || isDir(path.join(dir, "dark"));
  return hasManifest || (hasReadme && hasTheme);
}

export function hasChildPacks(dir: string): boolean {
  if (!isDir(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
    if (isPackDir(path.join(dir, entry.name))) return true;
  }
  return false;
}

export function scanPacks(assetRoot: string, extraPacks: string[]): IndexedPack[] {
  if (!isDir(assetRoot)) return [];
  const dirs: string[] = [];
  const rootReal = fs.realpathSync(assetRoot);
  if (isPackDir(rootReal)) dirs.push(rootReal);
  for (const entry of fs.readdirSync(rootReal, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(rootReal, entry.name);
    if (isPackDir(full)) dirs.push(full);
  }
  for (const extra of extraPacks) {
    if (!extra || !fs.existsSync(extra)) continue;
    const real = fs.realpathSync(extra);
    if (isPackDir(real)) dirs.push(real);
  }

  const seen = new Set<string>();
  const usedNames = new Set<string>();
  const packs: IndexedPack[] = [];
  for (const dir of dirs) {
    const real = fs.realpathSync(dir);
    if (seen.has(real)) continue;
    seen.add(real);
    const pack = loadPack(real);
    if (!pack) continue;
    let name = pack.name;
    if (usedNames.has(name)) {
      let n = 2;
      while (usedNames.has(`${pack.name}-${n}`)) n += 1;
      name = `${pack.name}-${n}`;
    }
    usedNames.add(name);
    packs.push({ ...pack, name });
  }
  packs.sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name));
  if (packs.length > 0) {
    const newest = packs.reduce((max, pack) => Math.max(max, pack.mtimeMs), 0);
    for (const pack of packs) pack.recent = pack.mtimeMs === newest && newest > 0;
    if (packs.filter((pack) => pack.recent).length > 1) {
      const first = packs.findIndex((pack) => pack.recent);
      packs.forEach((pack, index) => {
        pack.recent = index === first;
      });
    }
  }
  return packs;
}

export function loadPack(dir: string): IndexedPack | null {
  const root = fs.realpathSync(dir);
  const folder = path.basename(root);
  const manifestPath = path.join(root, "pack.json");
  let raw: Record<string, unknown> | null = null;
  const issues: Issue[] = [];
  let inferred = false;
  if (fs.existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        issues.push({ level: "error", message: "pack.json 必须是对象" });
      } else {
        raw = parsed as Record<string, unknown>;
      }
    } catch {
      issues.push({ level: "error", message: "pack.json 不是合法 JSON" });
    }
  } else {
    inferred = true;
  }

  const scanned = scanHtml(root);
  const screens = raw ? screensFromManifest(raw.screens, scanned, issues) : scanned;
  const themes = themesFrom(raw?.themes, screens, root);
  const docs = detectDocs(root, raw?.docs);
  const tools = listTools(root);
  const generator = parseGenerator(raw?.generator, root, tools, issues);
  const name = pickName(raw?.name, folder, issues);
  const displayName =
    typeof raw?.displayName === "string" && raw.displayName.trim()
      ? raw.displayName.trim()
      : readmeTitle(root) || name;
  const declaredVersion = typeof raw?.version === "string" ? raw.version.trim() : "";
  if (!declaredVersion && !inferred) issues.push({ level: "error", message: "缺少 version" });
  const version = declaredVersion || "0.0.0";
  const description =
    typeof raw?.description === "string"
      ? raw.description.trim()
      : "";
  const accent = sanitizeAccent(raw?.accent);

  const pack: IndexedPack = {
    name,
    displayName,
    version,
    description,
    accent,
    root,
    themes,
    screens,
    docs,
    tools,
    generator,
    htmlCount: countHtml(root),
    inferred,
    issues,
    mtimeMs: packMtime(root),
    recent: false,
    docBadge: docBadge(docs),
  };
  pack.issues = validateLoaded(pack);
  return pack;
}

export function readPackText(pack: IndexedPack, rel: string): FileContent {
  const norm = assertWritable(rel);
  const abs = resolveInside(pack.root, norm);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new PackError(`找不到文件 ${norm}`, 404);
  }
  const stat = fs.statSync(abs);
  if (stat.size > MAX_TEXT) throw new PackError("文件过大，无法在编辑器中打开");
  const content = fs.readFileSync(abs, "utf8");
  return { path: norm, content, bytes: Buffer.byteLength(content), kind: fileKind(norm) };
}

export function writePackText(pack: IndexedPack, rel: string, content: string): FileContent {
  if (typeof content !== "string") throw new PackError("content 必须是字符串");
  if (Buffer.byteLength(content) > MAX_TEXT) throw new PackError("内容过大");
  const norm = assertWritable(rel);
  if (norm === "pack.json") {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new PackError("pack.json 必须是 JSON 对象");
      }
    } catch (error) {
      if (error instanceof PackError) throw error;
      throw new PackError("pack.json 不是合法 JSON");
    }
  }
  const abs = resolveInside(pack.root, norm);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return { path: norm, content, bytes: Buffer.byteLength(content), kind: fileKind(norm) };
}

export async function regeneratePack(pack: IndexedPack, scope: string | undefined): Promise<RegenResult> {
  if (!pack.generator) throw new PackError("此包没有生成器。在 pack.json 声明 generator，或提供 tools/gen.py");
  const script = pack.generator.args.find((arg) => /\.(py|js|mjs)$/i.test(arg));
  if (!script) throw new PackError("generator.args 需要指向包内的 .py / .js / .mjs 脚本");
  resolveInside(pack.root, script);
  if (!fs.existsSync(path.join(pack.root, script))) throw new PackError(`生成脚本不存在：${script}`);

  const wanted = scope && scope !== "all" ? scope : "all";
  if (wanted !== "all" && !pack.screens.some((screen) => screen.id === wanted)) {
    throw new PackError(`未知屏幕 ${wanted}`);
  }
  const args = [...pack.generator.args];
  if (wanted !== "all") args.push("--screen", wanted);

  let stdout = "";
  let stderr = "";
  try {
    const result = await execFileAsync(pack.generator.command, args, {
      cwd: pack.root,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      encoding: "utf8",
    });
    stdout = result.stdout ?? "";
    stderr = result.stderr ?? "";
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: string | number };
    stdout = err.stdout ?? "";
    stderr = err.stderr ?? "";
    const detail = (stderr || stdout || err.message || "生成失败").trim();
    throw new PackError(detail.slice(0, 4000));
  }
  const wrote = stdout.split("\n").filter((line) => line.startsWith("wrote ")).length;
  return {
    pack: pack.name,
    command: [pack.generator.command, ...args].join(" "),
    scope: wanted,
    wrote,
    stdout: stdout.slice(0, 8000),
    stderr: stderr.slice(0, 8000),
  };
}

export function validateLoaded(pack: IndexedPack): Issue[] {
  const issues = [...pack.issues];
  const seen = new Set<string>();
  if (!pack.themes.length) issues.push({ level: "error", message: "没有 light/ 或 dark/ 主题" });
  if (pack.inferred) {
    issues.push({ level: "warning", message: "没有 pack.json，已根据 README 与 light/dark 推断" });
  }
  const paths = new Set<string>();
  for (const screen of pack.screens) {
    const key = `${screen.theme}:${screen.id}`;
    if (seen.has(key)) issues.push({ level: "error", message: `重复的屏幕 ${screen.id}（${screen.theme}）` });
    seen.add(key);
    if (paths.has(screen.path)) issues.push({ level: "error", message: `重复路径 ${screen.path}`, path: screen.path });
    paths.add(screen.path);
    if (!screen.path.endsWith(".html")) {
      issues.push({ level: "error", message: `${screen.path} 不是 HTML`, path: screen.path });
    }
    if (!screen.path.startsWith(`${screen.theme}/`)) {
      issues.push({
        level: "warning",
        message: `${screen.path} 不在 ${screen.theme}/ 下`,
        path: screen.path,
      });
    }
    const abs = path.join(pack.root, screen.path);
    if (!fs.existsSync(abs)) issues.push({ level: "error", message: `缺少页面 ${screen.path}`, path: screen.path });
  }
  const listed = new Set(pack.screens.map((screen) => screen.path));
  for (const found of scanHtml(pack.root)) {
    if (!listed.has(found.path)) {
      issues.push({ level: "warning", message: `未列入 screens：${found.path}`, path: found.path });
    }
  }
  for (const doc of Object.values(pack.docs)) {
    if (doc && !fs.existsSync(path.join(pack.root, doc))) {
      issues.push({ level: "error", message: `缺少文档 ${doc}`, path: doc });
    }
  }
  if (pack.generator) {
    const script = pack.generator.args.find((arg) => /\.(py|js|mjs)$/i.test(arg));
    if (!script || !fs.existsSync(path.join(pack.root, script))) {
      issues.push({ level: "error", message: "生成脚本不存在" });
    }
  }
  const pngCount = countExt(pack.root, ".png");
  if (pngCount > 0) {
    issues.push({
      level: "warning",
      message: `发现 ${pngCount} 个 PNG。产品只索引可点击 HTML，这些文件不会作为资产浏览。`,
    });
  }
  return dedupeIssues(issues);
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  const out: Issue[] = [];
  for (const issue of issues) {
    const key = `${issue.level}:${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

function screensFromManifest(value: unknown, scanned: Screen[], issues: Issue[]): Screen[] {
  if (value == null) return scanned;
  if (!Array.isArray(value)) {
    issues.push({ level: "error", message: "screens 必须是数组" });
    return scanned;
  }
  const screens: Screen[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push({ level: "error", message: `screens[${index}] 不是对象` });
      return;
    }
    const raw = item as Record<string, unknown>;
    if (typeof raw.path !== "string" || !raw.path.trim()) {
      issues.push({ level: "error", message: `screens[${index}] 缺少 path` });
      return;
    }
    let rel: string;
    try {
      rel = normalizeRel(raw.path);
    } catch (error) {
      issues.push({
        level: "error",
        message: error instanceof Error ? error.message : "非法屏幕路径",
        path: String(raw.path),
      });
      return;
    }
    const theme: ThemeName = raw.theme === "dark" || rel.startsWith("dark/") ? "dark" : "light";
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `screen-${index + 1}`;
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : titleFromFile(rel);
    const group = typeof raw.group === "string" && raw.group.trim() ? raw.group.trim() : "页面";
    const description = typeof raw.description === "string" ? raw.description.trim() : undefined;
    screens.push({ id, path: rel, title, group, theme, description });
  });
  return screens;
}

function themesFrom(value: unknown, screens: Screen[], root: string): ThemeName[] {
  const found = new Set<ThemeName>();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item === "light" || item === "dark") found.add(item);
    }
  }
  for (const screen of screens) found.add(screen.theme);
  if (isDir(path.join(root, "light"))) found.add("light");
  if (isDir(path.join(root, "dark"))) found.add("dark");
  return (["light", "dark"] as const).filter((theme) => found.has(theme));
}

function detectDocs(root: string, declared: unknown): PackDocs {
  const raw = declared && typeof declared === "object" ? (declared as Record<string, unknown>) : {};
  const docs: PackDocs = {};
  if (fs.existsSync(path.join(root, "pack.json"))) docs.packJson = "pack.json";
  const readme = firstExisting(root, [raw.readme, "README.md", "README"]);
  if (readme) docs.readme = readme;
  const featureMap = firstExisting(root, [raw.featureMap, raw.feature_map, "FEATURE_MAP.md"]);
  if (featureMap) docs.featureMap = featureMap;
  const styleGuide = firstExisting(root, [raw.styleGuide, raw.style_guide, "STYLE_GUIDE.md"]);
  if (styleGuide) docs.styleGuide = styleGuide;
  return docs;
}

function parseGenerator(
  value: unknown,
  root: string,
  tools: string[],
  issues: Issue[],
): GeneratorSpec | null {
  let command = "";
  let args: string[] = [];
  if (typeof value === "string" && value.trim()) {
    const parts = splitCommand(value.trim());
    command = parts[0] ?? "";
    args = parts.slice(1);
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    command = typeof raw.command === "string" ? raw.command : typeof raw.cmd === "string" ? raw.cmd : "";
    args = Array.isArray(raw.args) ? raw.args.filter((item): item is string => typeof item === "string") : [];
  } else if (tools.includes("tools/gen.py")) {
    command = "python3";
    args = ["tools/gen.py"];
  } else {
    return null;
  }
  if (!ALLOWED_COMMANDS.has(command) || command.includes("/")) {
    issues.push({ level: "warning", message: "generator 只允许 python3、python 或 node，已忽略" });
    return null;
  }
  const script = args.find((arg) => /\.(py|js|mjs)$/i.test(arg));
  if (!script || script.startsWith("/") || script.includes("..")) {
    issues.push({ level: "warning", message: "generator 需要包内相对脚本路径，已忽略" });
    return null;
  }
  if (args.some((arg) => BLOCKED_ARGS.has(arg))) {
    issues.push({ level: "warning", message: "generator 含有不允许的参数，已忽略" });
    return null;
  }
  try {
    normalizeRel(script);
  } catch {
    issues.push({ level: "warning", message: "generator 脚本路径非法，已忽略" });
    return null;
  }
  void root;
  return { command, args, label: [command, ...args].join(" ") };
}

function pickName(value: unknown, folder: string, issues: Issue[]): string {
  if (typeof value === "string" && NAME_RE.test(value)) return value;
  if (typeof value === "string" && value.trim()) {
    issues.push({ level: "warning", message: "pack.json name 含有不适合作为 id 的字符，已改用目录名" });
  }
  if (NAME_RE.test(folder)) return folder;
  issues.push({ level: "error", message: "目录名不能作为包名" });
  return "pack";
}

function docBadge(docs: PackDocs): string {
  if (docs.featureMap) return "FEATURE_MAP";
  if (docs.styleGuide) return "STYLE_GUIDE";
  if (docs.readme) return "README";
  return "pack.json";
}

function sanitizeAccent(value: unknown): string {
  if (typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return "#00B96B";
}

function scanHtml(root: string): Screen[] {
  const screens: Screen[] = [];
  for (const theme of ["light", "dark"] as const) {
    const dir = path.join(root, theme);
    if (!isDir(dir)) continue;
    walkFiles(dir, (file) => {
      if (!file.toLowerCase().endsWith(".html")) return;
      const rel = path.relative(root, file).split(path.sep).join("/");
      if (rel.split("/").some((part) => part.startsWith("."))) return;
      const parent = path.basename(path.dirname(file));
      const group = parent === theme ? "页面" : parent;
      screens.push({
        id: rel.replace(/\.html$/i, "").replace(/\//g, "-"),
        path: rel,
        title: readHtmlTitle(file) || titleFromFile(rel),
        group,
        theme,
      });
    });
  }
  return screens;
}

function countHtml(root: string): number {
  let count = 0;
  for (const theme of ["light", "dark"]) {
    const dir = path.join(root, theme);
    if (!isDir(dir)) continue;
    walkFiles(dir, (file) => {
      if (file.toLowerCase().endsWith(".html")) count += 1;
    });
  }
  return count;
}

function countExt(root: string, ext: string): number {
  let count = 0;
  const visit = (dir: string, depth: number) => {
    if (depth > 3) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full, depth + 1);
      else if (entry.name.toLowerCase().endsWith(ext)) count += 1;
    }
  };
  visit(root, 0);
  return count;
}

function packMtime(root: string): number {
  let max = 0;
  const consider = (file: string) => {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs > max) max = stat.mtimeMs;
    } catch {
      /* missing files are reported by validate */
    }
  };
  consider(root);
  consider(path.join(root, "pack.json"));
  for (const name of ["README.md", "FEATURE_MAP.md", "STYLE_GUIDE.md"]) consider(path.join(root, name));
  const tools = path.join(root, "tools");
  if (isDir(tools)) walkFiles(tools, consider);
  for (const theme of ["light", "dark"]) {
    const dir = path.join(root, theme);
    if (isDir(dir)) walkFiles(dir, consider);
  }
  return max;
}

function listTools(root: string): string[] {
  const dir = path.join(root, "tools");
  if (!isDir(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => `tools/${entry.name}`)
    .sort();
}

function firstExisting(root: string, candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    try {
      const rel = normalizeRel(candidate);
      if (fs.existsSync(path.join(root, rel)) && fs.statSync(path.join(root, rel)).isFile()) return rel;
    } catch {
      continue;
    }
  }
  return undefined;
}

function readmeTitle(root: string): string | undefined {
  for (const name of ["README.md", "README"]) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8").slice(0, 2000);
    const match = text.match(/^#\s+(.+)$/m);
    if (match) return match[1].trim();
  }
  return undefined;
}

function readHtmlTitle(file: string): string | undefined {
  const text = fs.readFileSync(file, "utf8").slice(0, 4000);
  const match = text.match(/<title>([^<]+)<\/title>/i);
  if (!match) return undefined;
  const title = match[1].trim();
  return title || undefined;
}

function titleFromFile(rel: string): string {
  const base = path.basename(rel, path.extname(rel));
  return base.replace(/[-_]+/g, " ");
}

function splitCommand(input: string): string[] {
  const parts: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (const match of input.matchAll(pattern)) {
    parts.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return parts.filter(Boolean);
}

function walkFiles(dir: string, visit: (file: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, visit);
    else if (entry.isFile()) visit(full);
  }
}

function isDir(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}
