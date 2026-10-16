import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Service } from "./service.js";

export function createMcpServer(service: Service): McpServer {
  const server = new McpServer({
    name: "miao-pack",
    version: service.getState().version || "0.1.0",
  });

  server.registerTool(
    "list",
    {
      title: "列出资产包",
      description: "列出资产根目录下已索引的 HTML 设计包、主题、页面与文档。",
      inputSchema: {},
    },
    async () => {
      const state = service.getState();
      return ok({
        assetRoot: state.assetRoot,
        packCount: state.packCount,
        pageCount: state.pageCount,
        packs: state.packs.map(summarize),
      });
    },
  );

  server.registerTool(
    "get",
    {
      title: "读取包内文件",
      description: "读取文档或 HTML 页面的内容与元数据。用 path，或 screenId + theme。",
      inputSchema: {
        pack: z.string().describe("包名，例如 miao-pi-ui"),
        path: z.string().optional().describe("包内相对路径，例如 light/main.html 或 README.md"),
        screenId: z.string().optional().describe("屏幕 id，需同时给出 theme"),
        theme: z.enum(["light", "dark"]).optional().describe("浏览主题 light 或 dark"),
      },
    },
    async ({ pack, path: rel, screenId, theme }) => {
      try {
        const found = service.requirePack(pack);
        const target = resolveTarget(found.screens, rel, screenId, theme);
        const file = service.readFile(pack, target);
        const screen = found.screens.find((item) => item.path === file.path) ?? null;
        return ok({ pack: found.name, ...file, screen });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update",
    {
      title: "更新包内文件",
      description: "写入 Markdown、pack.json、主题 HTML 或 tools/ 脚本。与 Web UI 共用同一文件。",
      inputSchema: {
        pack: z.string().describe("包名"),
        path: z.string().describe("包内相对路径"),
        content: z.string().describe("完整文件内容"),
      },
    },
    async ({ pack, path: rel, content }) => {
      try {
        const file = service.writeFile(pack, rel, content);
        return ok({ pack, path: file.path, bytes: file.bytes, kind: file.kind });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "regenerate",
    {
      title: "重新生成 HTML",
      description: "运行包内生成器（默认 python3 tools/gen.py），只重写 HTML，不产出 PNG。scope 为 all 或屏幕 id。",
      inputSchema: {
        pack: z.string().describe("包名"),
        scope: z.string().optional().describe("all，或某个屏幕 id"),
      },
    },
    async ({ pack, scope }) => {
      try {
        return ok(await service.regenerate(pack, scope));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "validate",
    {
      title: "校验资产包",
      description: "检查 pack.json、主题 HTML、文档路径和生成器。省略 pack 时校验全部已索引包。",
      inputSchema: {
        pack: z.string().optional().describe("包名；省略则校验全部"),
      },
    },
    async ({ pack }) => {
      try {
        return ok(service.validate(pack));
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}

export async function startMcp(service: Service): Promise<void> {
  const server = createMcpServer(service);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function resolveTarget(
  screens: { id: string; path: string; theme: "light" | "dark" }[],
  rel: string | undefined,
  screenId: string | undefined,
  theme: "light" | "dark" | undefined,
): string {
  if (rel && rel.trim()) return rel;
  if (!screenId) throw new Error("需要 path，或 screenId + theme");
  const matches = screens.filter((screen) => screen.id === screenId && (!theme || screen.theme === theme));
  if (matches.length === 1) return matches[0].path;
  if (matches.length === 0) throw new Error(`找不到屏幕 ${screenId}`);
  throw new Error("该屏幕同时存在于 light 与 dark，请指定 theme");
}

function summarize(pack: ReturnType<Service["requirePack"]>) {
  return {
    name: pack.name,
    displayName: pack.displayName,
    version: pack.version,
    description: pack.description,
    root: pack.root,
    themes: pack.themes,
    htmlCount: pack.htmlCount,
    docBadge: pack.docBadge,
    screens: pack.screens,
    docs: pack.docs,
    tools: pack.tools,
    generator: pack.generator?.label ?? null,
    issues: pack.issues,
  };
}

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}
