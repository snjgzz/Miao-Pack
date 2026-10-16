#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfigPath } from "./config.js";
import { startServer } from "./http.js";
import { startMcp } from "./mcp.js";
import { isPackDir, loadPack } from "./packs.js";
import { createService, loadServiceOptions } from "./service.js";

type Flags = {
  root?: string;
  port: number;
  host: string;
  open: boolean;
  help: boolean;
};

const HELP = `Miao Pack · 本地 HTML 设计资产包

用法
  miao-pack serve [--root 目录] [--port 4173] [--host 127.0.0.1] [--open]
  miao-pack mcp [--root 目录]
  miao-pack validate [包目录或资产根]

说明
  serve    打开 Web UI，浏览、预览、编辑包内 HTML 与文档
  mcp      启动 stdio MCP：list / get / update / regenerate / validate
  validate 检查 pack.json、主题页面和生成器

资产包
  pack.json
  README.md
  FEATURE_MAP.md    可选
  STYLE_GUIDE.md    可选
  light/*.html
  dark/*.html
  tools/            可选生成器
`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(HELP);
    return;
  }
  const flags = parseFlags(rest);
  if (flags.help) {
    process.stdout.write(HELP);
    return;
  }
  if (command === "serve") {
    await serve(flags);
    return;
  }
  if (command === "mcp") {
    await mcp(flags);
    return;
  }
  if (command === "validate") {
    const code = validate(flags, rest.filter((arg) => !arg.startsWith("--")));
    process.exitCode = code;
    return;
  }
  process.stderr.write(`未知命令 ${command}\n\n${HELP}`);
  process.exitCode = 1;
}

async function serve(flags: Flags): Promise<void> {
  const options = loadServiceOptions({ rootFlag: flags.root, configPath: defaultConfigPath() });
  const service = createService(options);
  const started = await startServer(service, { host: flags.host, port: flags.port });
  const state = service.getState();
  process.stdout.write(
    [
      `Miao Pack  ${state.version}`,
      `Web UI     ${started.url}`,
      `资产根目录  ${state.assetRoot}`,
      `已索引      ${state.packCount} 个包 · ${state.pageCount} 个页面`,
      `MCP        node ${fileURLToPath(import.meta.url)} mcp --root ${state.assetRoot}`,
      "",
    ].join("\n"),
  );
  if (flags.open) openBrowser(started.url);
  const shutdown = async () => {
    await started.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

async function mcp(flags: Flags): Promise<void> {
  const options = loadServiceOptions({ rootFlag: flags.root, configPath: defaultConfigPath() });
  const service = createService(options);
  await startMcp(service);
}

function validate(flags: Flags, positionals: string[]): number {
  const target = positionals[0] ? path.resolve(positionals[0]) : undefined;
  if (target && isPackDir(target)) {
    const pack = loadPack(target);
    if (!pack) {
      process.stderr.write("无法读取该资产包\n");
      return 1;
    }
    return report([pack]);
  }
  const root = target ?? flags.root;
  const options = loadServiceOptions({
    rootFlag: root,
    configPath: defaultConfigPath(),
  });
  const service = createService({ ...options, configPath: null });
  const result = service.validate();
  const code = report(
    result.packs.map((item) => ({
      name: item.name,
      issues: item.issues,
    })),
  );
  if (result.packs.length === 0) {
    process.stderr.write(`未在 ${options.assetRoot} 发现资产包\n`);
    return 1;
  }
  return code;
}

function report(packs: { name: string; issues: { level: string; message: string }[] }[]): number {
  let errors = 0;
  for (const pack of packs) {
    const packErrors = pack.issues.filter((issue) => issue.level === "error");
    errors += packErrors.length;
    const mark = packErrors.length ? "error" : "ok";
    process.stdout.write(`${pack.name}  ${mark}\n`);
    for (const issue of pack.issues) {
      process.stdout.write(`  ${issue.level}  ${issue.message}\n`);
    }
  }
  return errors > 0 ? 1 : 0;
}

function parseFlags(args: string[]): Flags {
  const flags: Flags = { port: 4173, host: "127.0.0.1", open: false, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg === "--open") flags.open = true;
    else if (arg === "--root") flags.root = needValue(args, ++i, "--root");
    else if (arg.startsWith("--root=")) flags.root = arg.slice("--root=".length);
    else if (arg === "--port") flags.port = Number(needValue(args, ++i, "--port"));
    else if (arg.startsWith("--port=")) flags.port = Number(arg.slice("--port=".length));
    else if (arg === "--host") flags.host = needValue(args, ++i, "--host");
    else if (arg.startsWith("--host=")) flags.host = arg.slice("--host=".length);
    else if (arg.startsWith("-")) throw new Error(`未知参数 ${arg}`);
  }
  if (!Number.isInteger(flags.port) || flags.port < 0 || flags.port > 65535) {
    throw new Error("--port 必须是 0–65535 的整数");
  }
  return flags;
}

function needValue(args: string[], index: number, name: string): string {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${name} 需要一个值`);
  return value;
}

function openBrowser(url: string): void {
  import("node:child_process")
    .then(({ spawn }) => {
      const bin = process.platform === "darwin" ? "open" : "xdg-open";
      const child = spawn(bin, [url], { detached: true, stdio: "ignore" });
      child.on("error", () => undefined);
      child.unref();
    })
    .catch(() => undefined);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
