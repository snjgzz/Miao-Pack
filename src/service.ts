import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readConfig, writeConfig, type AppConfig } from "./config.js";
import { contentType, normalizeRel, resolveInside } from "./paths.js";
import {
  hasChildPacks,
  isPackDir,
  readPackText,
  regeneratePack,
  scanPacks,
  writePackText,
} from "./packs.js";
import { packageRoot } from "./root.js";
import {
  PackError,
  type FileContent,
  type IndexState,
  type IndexedPack,
  type Issue,
  type RegenResult,
} from "./types.js";

export type ServiceOptions = {
  assetRoot: string;
  extraPacks?: string[];
  appTheme?: "light" | "dark";
  /** When null, settings stay in memory. */
  configPath?: string | null;
};

export type Service = {
  getState(): IndexState;
  refresh(): IndexState;
  updateSettings(patch: { assetRoot?: string; appTheme?: "light" | "dark" }): IndexState;
  importPack(absPath: string): IndexState;
  requirePack(name: string): IndexedPack;
  readFile(pack: string, rel: string): FileContent;
  writeFile(pack: string, rel: string, content: string): FileContent;
  validate(packName?: string): { ok: boolean; packs: { name: string; root: string; issues: Issue[] }[] };
  regenerate(pack: string, scope?: string): Promise<RegenResult>;
  reveal(pack: string, rel?: string): { path: string; opened: boolean };
  resolvePreview(pack: string, rel: string): { file: string; contentType: string };
};

export function createService(options: ServiceOptions): Service {
  const version = readPackageVersion();
  let assetRoot = path.resolve(options.assetRoot);
  let extraPacks = [...(options.extraPacks ?? [])];
  let appTheme: "light" | "dark" = options.appTheme === "dark" ? "dark" : "light";
  let indexedAt = new Date().toISOString();
  const configPath = options.configPath ?? null;

  function persist(): void {
    if (!configPath) return;
    const config: AppConfig = { assetRoot, extraPacks, appTheme };
    writeConfig(configPath, config);
  }

  function snapshot(): IndexState {
    const packs = fs.existsSync(assetRoot) ? scanPacks(assetRoot, extraPacks) : [];
    const pageCount = packs.reduce((sum, pack) => sum + pack.htmlCount, 0);
    const revision = String(packs.reduce((max, pack) => Math.max(max, pack.mtimeMs), 0));
    return {
      assetRoot,
      extraPacks,
      appTheme,
      version,
      indexedAt,
      revision,
      pageCount,
      packCount: packs.length,
      packs,
      mcp: mcpLaunch(assetRoot),
    };
  }

  function requirePack(name: string): IndexedPack {
    const pack = snapshot().packs.find((item) => item.name === name);
    if (!pack) throw new PackError(`找不到包 ${name}`, 404);
    return pack;
  }

  return {
    getState: snapshot,
    refresh() {
      indexedAt = new Date().toISOString();
      return snapshot();
    },
    updateSettings(patch) {
      if (patch.assetRoot !== undefined) {
        const next = path.resolve(patch.assetRoot);
        if (!fs.existsSync(next) || !fs.statSync(next).isDirectory()) {
          throw new PackError("资产根目录不存在");
        }
        assetRoot = fs.realpathSync(next);
      }
      if (patch.appTheme !== undefined) {
        if (patch.appTheme !== "light" && patch.appTheme !== "dark") throw new PackError("应用主题只能是 light 或 dark");
        appTheme = patch.appTheme;
      }
      indexedAt = new Date().toISOString();
      persist();
      return snapshot();
    },
    importPack(absPath) {
      if (typeof absPath !== "string" || !absPath.trim()) throw new PackError("请填写包目录的绝对路径");
      const resolved = path.resolve(absPath.trim());
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        throw new PackError("目录不存在");
      }
      if (!isPackDir(resolved)) {
        throw new PackError("该目录不是资产包（需要 pack.json，或 README 加上 light/ 与 dark/）");
      }
      const real = fs.realpathSync(resolved);
      const rootReal = fs.existsSync(assetRoot) ? fs.realpathSync(assetRoot) : path.resolve(assetRoot);
      const rel = path.relative(rootReal, real);
      const alreadyInside = rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel) && !rel.includes(path.sep));
      if (!alreadyInside && !extraPacks.includes(real)) extraPacks.push(real);
      indexedAt = new Date().toISOString();
      persist();
      return snapshot();
    },
    requirePack,
    readFile(pack, rel) {
      return readPackText(requirePack(pack), rel);
    },
    writeFile(pack, rel, content) {
      const written = writePackText(requirePack(pack), rel, content);
      indexedAt = new Date().toISOString();
      return written;
    },
    validate(packName) {
      const packs = packName ? [requirePack(packName)] : snapshot().packs;
      return {
        ok: packs.every((pack) => pack.issues.every((issue) => issue.level !== "error")),
        packs: packs.map((pack) => ({ name: pack.name, root: pack.root, issues: pack.issues })),
      };
    },
    async regenerate(pack, scope) {
      const result = await regeneratePack(requirePack(pack), scope);
      indexedAt = new Date().toISOString();
      return result;
    },
    reveal(pack, rel) {
      const found = requirePack(pack);
      const target = rel ? resolveInside(found.root, normalizeRel(rel)) : found.root;
      const dir = fs.existsSync(target) && fs.statSync(target).isDirectory() ? target : path.dirname(target);
      return { path: dir, opened: tryOpen(dir) };
    },
    resolvePreview(pack, rel) {
      const found = requirePack(pack);
      const norm = normalizeRel(rel);
      const type = contentType(norm);
      if (!type) throw new PackError("该文件不能预览");
      const file = resolveInside(found.root, norm);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new PackError("找不到预览文件", 404);
      return { file, contentType: type };
    },
  };
}

export function loadServiceOptions(input: {
  rootFlag?: string;
  configPath: string;
}): { assetRoot: string; extraPacks: string[]; appTheme: "light" | "dark"; configPath: string } {
  const saved = readConfig(input.configPath);
  let assetRoot: string;
  if (input.rootFlag) assetRoot = path.resolve(input.rootFlag);
  else if (saved?.assetRoot && fs.existsSync(saved.assetRoot)) assetRoot = path.resolve(saved.assetRoot);
  else assetRoot = defaultAssetRoot();
  return {
    assetRoot,
    extraPacks: saved?.extraPacks ?? [],
    appTheme: saved?.appTheme ?? "light",
    configPath: input.configPath,
  };
}

export function defaultAssetRoot(): string {
  const cwd = process.cwd();
  if (isPackDir(cwd) || hasChildPacks(cwd)) return cwd;
  return path.join(packageRoot(), "samples");
}

function readPackageVersion(): string {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(packageRoot(), "package.json"), "utf8")) as { version?: string };
    return raw.version || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function mcpLaunch(assetRoot: string): IndexState["mcp"] {
  const cli = path.join(packageRoot(), "dist", "cli.js");
  return {
    command: "node",
    args: [cli, "mcp", "--root", assetRoot],
    npx: {
      command: "npx",
      args: ["-y", "miao-pack", "mcp", "--root", assetRoot],
    },
  };
}

function tryOpen(dir: string): boolean {
  for (const bin of ["xdg-open", "open"]) {
    try {
      const child = spawn(bin, [dir], { detached: true, stdio: "ignore" });
      child.on("error", () => undefined);
      child.unref();
      return true;
    } catch {
      continue;
    }
  }
  return false;
}
