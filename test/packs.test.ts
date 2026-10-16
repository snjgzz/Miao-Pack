import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { startServer } from "../src/http.ts";
import { createMcpServer } from "../src/mcp.ts";
import { isPackDir, scanPacks } from "../src/packs.ts";
import { packageRoot } from "../src/root.ts";
import { createService } from "../src/service.ts";
import { PackError } from "../src/types.ts";

const samples = path.join(packageRoot(), "samples");

function serviceOn(root: string) {
  return createService({ assetRoot: root, configPath: null });
}

test("indexes the bundled sample packs", () => {
  const packs = scanPacks(samples, []);
  const names = packs.map((pack) => pack.name).sort();
  assert.deepEqual(names, ["miao-agent-design", "miao-pi-ui", "oneoffice-home"]);
  const pi = packs.find((pack) => pack.name === "miao-pi-ui");
  assert.ok(pi);
  assert.equal(pi.htmlCount, 34);
  assert.equal(pi.docBadge, "FEATURE_MAP");
  assert.equal(pi.screens.filter((screen) => screen.theme === "light").length, 17);
  assert.equal(packs.find((pack) => pack.name === "miao-agent-design")?.htmlCount, 14);
  assert.equal(packs.find((pack) => pack.name === "oneoffice-home")?.htmlCount, 6);
  assert.equal(packs.find((pack) => pack.name === "oneoffice-home")?.docBadge, "README");
  for (const pack of packs) {
    assert.equal(pack.issues.filter((issue) => issue.level === "error").length, 0, pack.name);
  }
  assert.equal(packs.filter((pack) => pack.recent).length, 1);
});

test("rejects paths that escape the pack", () => {
  const service = serviceOn(samples);
  assert.throws(() => service.readFile("miao-pi-ui", "../package.json"), PackError);
  assert.throws(() => service.readFile("miao-pi-ui", "light/../../package.json"), PackError);
  assert.throws(() => service.writeFile("miao-pi-ui", "tools/../../package.json", "x"), PackError);
});

test("reads HTML and round-trips a markdown edit in a copy", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "miao-pack-"));
  fs.cpSync(path.join(samples, "oneoffice-home"), path.join(dir, "oneoffice-home"), { recursive: true });
  const service = serviceOn(dir);
  const file = service.readFile("oneoffice-home", "light/home.html");
  assert.match(file.content, /首页/);
  const next = "# OneOffice 首页\n\n已由测试改写。\n";
  service.writeFile("oneoffice-home", "README.md", next);
  assert.equal(service.readFile("oneoffice-home", "README.md").content, next);
  assert.throws(() => service.writeFile("oneoffice-home", "light/home.png", "nope"), PackError);
});

test("infers a pack that only has README and theme HTML", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "miao-pack-infer-"));
  const pack = path.join(dir, "scratch");
  fs.mkdirSync(path.join(pack, "light"), { recursive: true });
  fs.writeFileSync(path.join(pack, "README.md"), "# 草稿包\n", "utf8");
  fs.writeFileSync(path.join(pack, "light", "home.html"), "<title>草稿首页</title>", "utf8");
  assert.equal(isPackDir(pack), true);
  const indexed = scanPacks(dir, [])[0];
  assert.equal(indexed.inferred, true);
  assert.equal(indexed.displayName, "草稿包");
  assert.equal(indexed.screens[0].title, "草稿首页");
  assert.ok(indexed.issues.some((issue) => issue.level === "warning"));
});

test("regenerate rewrites HTML and validate reports a stray png", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "miao-pack-gen-"));
  fs.cpSync(path.join(samples, "oneoffice-home"), path.join(dir, "oneoffice-home"), { recursive: true });
  const service = serviceOn(dir);
  const before = service.readFile("oneoffice-home", "light/home.html").content;
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const result = await service.regenerate("oneoffice-home", "home");
  assert.equal(result.wrote, 2);
  const after = service.readFile("oneoffice-home", "light/home.html").content;
  assert.notEqual(before, after);
  assert.match(after, /生成于/);
  fs.writeFileSync(path.join(dir, "oneoffice-home", "light", "shot.png"), "not-a-real-png");
  const report = service.validate("oneoffice-home");
  assert.equal(report.ok, true);
  assert.ok(report.packs[0].issues.some((issue) => issue.message.includes("PNG")));
});

test("http serves the shell, preview, and file edits", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "miao-pack-http-"));
  fs.cpSync(samples, dir, { recursive: true });
  const service = serviceOn(dir);
  const started = await startServer(service, { host: "127.0.0.1", port: 0 });
  try {
    const page = await fetch(`${started.url}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Miao Pack/);
    const state = await (await fetch(`${started.url}/api/state`)).json();
    assert.equal(state.packCount, 3);
    const preview = await fetch(`${started.url}/preview/miao-pi-ui/light/main.html`);
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get("content-type") || "", /text\/html/);
    assert.match(await preview.text(), /会话主路径/);
    const escaped = await fetch(`${started.url}/preview/miao-pi-ui/..%2F..%2Fpackage.json`);
    assert.equal(escaped.status, 400);
    const saved = await fetch(`${started.url}/api/packs/oneoffice-home/file`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "README.md", content: "# 改过\n" }),
    });
    assert.equal(saved.status, 200);
    assert.match(fs.readFileSync(path.join(dir, "oneoffice-home", "README.md"), "utf8"), /改过/);
  } finally {
    await started.close();
  }
});

test("mcp list, get, update, and validate share the pack files", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "miao-pack-mcp-"));
  fs.cpSync(path.join(samples, "miao-agent-design"), path.join(dir, "miao-agent-design"), { recursive: true });
  const service = serviceOn(dir);
  const server = createMcpServer(service);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "miao-pack-test", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((tool) => tool.name).sort(),
    ["get", "list", "regenerate", "update", "validate"],
  );
  const listed = await client.callTool({ name: "list", arguments: {} });
  const listedText = textOf(listed);
  assert.match(listedText, /miao-agent-design/);
  const got = await client.callTool({
    name: "get",
    arguments: { pack: "miao-agent-design", screenId: "composer", theme: "dark" },
  });
  assert.match(textOf(got), /dark\/composer\.html/);
  const updated = await client.callTool({
    name: "update",
    arguments: { pack: "miao-agent-design", path: "STYLE_GUIDE.md", content: "# 改过的规范\n" },
  });
  assert.equal(updated.isError, undefined);
  assert.match(fs.readFileSync(path.join(dir, "miao-agent-design", "STYLE_GUIDE.md"), "utf8"), /改过的规范/);
  const bad = await client.callTool({
    name: "update",
    arguments: { pack: "miao-agent-design", path: "../outside.txt", content: "no" },
  });
  assert.equal(bad.isError, true);
  const report = await client.callTool({ name: "validate", arguments: { pack: "miao-agent-design" } });
  assert.match(textOf(report), /"ok": true/);
  await client.close();
  await server.close();
});

function textOf(result: { content?: unknown }): string {
  const content = result.content as { text?: string }[] | undefined;
  return content?.map((item) => item.text || "").join("\n") || "";
}
