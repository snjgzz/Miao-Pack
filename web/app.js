const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  layers: '<path d="m12 2-10 5 10 5 10-5-10-5Z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  download: '<path d="M12 3v12M8 11l4 4 4-4M4 21h16"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  box: '<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  ext: '<path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  wand: '<path d="m15 4 5 5L9 20l-5-5zM12 7l5 5"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  stack: '<path d="M3 3h18v18H3z"/><path d="M8 8h8v11H8zM12 8v8"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>',
};

const state = {
  view: "library",
  settingsTab: "paths",
  data: null,
  query: "",
  packName: null,
  path: null,
  browseTheme: "light",
  mode: "preview",
  actualSize: false,
  collapsed: new Set(["theme:dark", "tools"]),
  editor: null,
  dialog: null,
  packMenu: false,
  searchOpen: false,
  searchIndex: 0,
};

const sidebar = document.getElementById("sidebar");
const topbar = document.getElementById("topbar");
const stage = document.getElementById("stage");
const dialogRoot = document.getElementById("dialog-root");
const toastEl = document.getElementById("toast");
let toastTimer = 0;

function icon(name, size = 16) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${I[name] || ""}</svg>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

async function api(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败 ${response.status}`);
  return data;
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

function packBy(name) {
  return state.data?.packs.find((pack) => pack.name === name) || null;
}

function currentPack() {
  return packBy(state.packName);
}

function docEntries(pack) {
  const docs = [];
  if (pack.docs.packJson) docs.push({ path: pack.docs.packJson, title: "包清单", badge: "json" });
  if (pack.docs.readme) docs.push({ path: pack.docs.readme, title: "包说明", badge: "md" });
  if (pack.docs.featureMap) docs.push({ path: pack.docs.featureMap, title: "功能映射", badge: "md" });
  if (pack.docs.styleGuide) docs.push({ path: pack.docs.styleGuide, title: "视觉规范", badge: "md" });
  return docs;
}

function isDoc(rel) {
  return /^(pack\.json|README(\.md)?|FEATURE_MAP\.md|STYLE_GUIDE\.md)$/.test(rel || "");
}

function screenOf(pack, rel) {
  return pack?.screens.find((screen) => screen.path === rel) || null;
}

function confirmDiscard() {
  if (state.editor && state.editor.draft !== state.editor.original) return window.confirm("放弃未保存的更改？");
  return true;
}

function relTime(iso) {
  if (!iso) return "刚刚";
  const delta = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 60_000) return "刚刚";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function queryMatch(text) {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return String(text).toLowerCase().includes(q);
}

function hits() {
  const q = state.query.trim().toLowerCase();
  if (!q || !state.data) return [];
  const out = [];
  for (const pack of state.data.packs) {
    for (const screen of pack.screens) {
      const blob = `${pack.displayName} ${pack.name} ${screen.title} ${screen.group} ${screen.path}`;
      if (blob.toLowerCase().includes(q)) {
        out.push({ pack: pack.name, path: screen.path, title: screen.title, hint: `${pack.name} · ${screen.path}` });
      }
    }
    for (const doc of docEntries(pack)) {
      const blob = `${pack.name} ${doc.title} ${doc.path}`;
      if (blob.toLowerCase().includes(q)) {
        out.push({ pack: pack.name, path: doc.path, title: doc.title, hint: `${pack.name} · ${doc.path}` });
      }
    }
  }
  return out.slice(0, 12);
}

function previewSrc(pack, rel) {
  const version = state.data?.revision || "";
  const encoded = rel.split("/").map(encodeURIComponent).join("/");
  return `/preview/${encodeURIComponent(pack)}/${encoded}?v=${encodeURIComponent(version)}`;
}

function captureFocus() {
  const el = document.activeElement;
  if (!el || !el.id) return null;
  return { id: el.id, start: el.selectionStart, end: el.selectionEnd };
}

function restoreFocus(saved) {
  if (!saved) return;
  const el = document.getElementById(saved.id);
  if (!el) return;
  el.focus();
  if (typeof saved.start === "number" && el.setSelectionRange) el.setSelectionRange(saved.start, saved.end);
}

function render() {
  const focus = captureFocus();
  applyTheme(state.data?.appTheme || "light");
  renderSidebar();
  renderTopbar();
  renderStage();
  renderDialog();
  restoreFocus(focus);
}

function renderSidebar() {
  const packs = state.data?.packs || [];
  const themeLabel = state.data?.appTheme === "dark" ? "深色" : "浅色";
  sidebar.innerHTML = `
    <div class="lights"><i class="r"></i><i class="y"></i><i class="g"></i></div>
    <div class="brand">
      <div class="logo">${icon("layers", 14)}</div>
      <div><div class="name">Miao Pack</div><div class="sub">npm · MCP</div></div>
    </div>
    <div class="nav">
      <button class="nav-item ${state.view === "library" ? "on" : ""}" data-act="nav-library">${icon("home")}资产库</button>
      <button class="nav-item ${state.view === "settings" ? "on" : ""}" data-act="nav-settings">${icon("gear")}设置</button>
    </div>
    <div class="nav-sec">已索引的包</div>
    <div class="pack-list">
      ${packs.map((pack) => `
        <button class="pack-mini ${state.view === "browse" && state.packName === pack.name ? "on" : ""}" data-act="open-pack" data-pack="${esc(pack.name)}">
          <span class="dot" style="background:${esc(pack.accent)}"></span>
          <span class="nm">${esc(pack.name)}</span>
          <span class="cnt">${pack.htmlCount} 页</span>
        </button>`).join("") || `<div class="empty">还没有包</div>`}
    </div>
    <div class="sb-foot">
      <button class="nav-item" data-act="import">${icon("download")}导入本地包…</button>
      <button class="nav-item" data-act="theme-app">${icon(state.data?.appTheme === "dark" ? "sun" : "moon")}应用主题：${themeLabel}</button>
    </div>`;
}

function renderTopbar() {
  const editing = state.view === "browse" && state.mode === "edit" && state.editor;
  const dirty = editing && state.editor.draft !== state.editor.original;
  const pack = currentPack();
  const canRegen = Boolean(editing && pack?.generator && (state.editor.kind === "html" || state.editor.kind === "python"));
  topbar.innerHTML = `
    <div class="crumb">${crumbs()}</div>
    <div class="search">
      ${icon("search", 14)}
      <input id="q" placeholder="搜索页面、文档…" value="${esc(state.query)}" autocomplete="off"/>
      ${searchPop()}
    </div>
    ${state.view === "library" ? `
      <button class="tbtn" data-act="import">${icon("plus", 14)}导入包</button>
      <button class="tbtn pri" data-act="refresh">${icon("refresh", 14)}刷新索引</button>` : ""}
    ${state.view === "browse" && state.mode !== "edit" ? `
      <button class="pill btn" data-act="theme-browse">浏览主题 · ${esc(state.browseTheme)}</button>
      <button class="iconbtn" title="应用主题" data-act="theme-app">${icon(state.data?.appTheme === "dark" ? "sun" : "moon", 15)}</button>` : ""}
    ${editing ? `
      <span class="pill" id="dirty" ${dirty ? "" : "hidden"}>未保存更改</span>
      <button class="tbtn" data-act="discard">放弃</button>
      <button class="tbtn" data-act="save">保存</button>
      ${canRegen ? `<button class="tbtn pri" data-act="save-regen">${icon("wand", 14)}保存并重新生成</button>` : ""}
      <button class="tbtn" data-act="back-preview">${state.editor.kind === "html" ? "预览" : "返回浏览"}</button>` : ""}`;
}

function crumbs() {
  if (state.view === "settings") return "<b>设置 · Miao Pack</b>";
  if (state.view !== "browse") return "<b>资产库</b>";
  const pack = currentPack();
  const parts = [`<button data-act="nav-library">资产库</button>`, `<span class="sep">/</span>`, `<span>${esc(pack?.name || "")}</span>`];
  const screen = screenOf(pack, state.path);
  if (screen) {
    parts.push(`<span class="sep">/</span><span>${esc(screen.theme)}</span><span class="sep">/</span><b>${esc(state.path.split("/").pop())}</b>`);
  } else if (state.path) {
    parts.push(`<span class="sep">/</span><b>${esc(state.path.split("/").pop())}</b>`);
  }
  return parts.join("");
}

function searchPop() {
  if (!state.searchOpen || !state.query.trim()) return "";
  const items = hits();
  if (!items.length) return `<div class="search-pop"><div class="search-hit"><b>没有匹配</b><span>试试页面标题或路径</span></div></div>`;
  return `<div class="search-pop">${items.map((hit, index) => `
    <button class="search-hit ${index === state.searchIndex ? "on" : ""}" data-act="search-hit" data-pack="${esc(hit.pack)}" data-path="${esc(hit.path)}">
      <b>${esc(hit.title)}</b><span>${esc(hit.hint)}</span>
    </button>`).join("")}</div>`;
}

function renderStage() {
  if (shouldKeepEditor()) return;
  if (!state.data) {
    stage.innerHTML = `<div class="content"><div class="empty"><h3>正在索引…</h3></div></div>`;
    return;
  }
  if (state.view === "library") stage.innerHTML = libraryHtml();
  else if (state.view === "settings") stage.innerHTML = settingsHtml();
  else if (state.mode === "edit" && state.editor) {
    stage.innerHTML = editorHtml();
    bindEditor();
  } else stage.innerHTML = browseHtml();
}

function shouldKeepEditor() {
  const input = document.getElementById("editor");
  return Boolean(input && state.view === "browse" && state.mode === "edit" && state.editor && input.dataset.path === state.editor.path);
}

function libraryHtml() {
  const packs = visiblePacks();
  const pages = state.data.pageCount;
  return `<div class="content">
    <div class="page-h">
      <div>
        <h1>资产库</h1>
        <p>Miao Pack · 管理本地 HTML 设计资产包 · 共 ${state.data.packCount} 个包 · ${pages} 个页面</p>
      </div>
      <div class="status"><i class="ok"></i>索引已同步 · ${esc(relTime(state.data.indexedAt))}</div>
    </div>
    <div class="suite-banner">
      <div class="bico">${icon("stack")}</div>
      <div>
        <h4>两件套：npm 包 + MCP</h4>
        <p>本地 <code>npx miao-pack serve</code> 打开 Web UI；Agent 经 MCP 按约定 list / get / update / regenerate。本界面为 Web 壳，不是原生安装包。</p>
      </div>
    </div>
    ${packs.length ? `<div class="grid">${packs.map(cardHtml).join("")}</div>` : `<div class="empty"><h3>没有匹配的资产包</h3><p>调整搜索，或导入一个含 pack.json 的目录。</p></div>`}
  </div>`;
}

function visiblePacks() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.data.packs;
  return state.data.packs.filter((pack) => {
    const blob = [pack.name, pack.displayName, pack.description, pack.root, ...pack.screens.flatMap((screen) => [screen.title, screen.path, screen.group])].join(" ");
    return blob.toLowerCase().includes(q);
  });
}

function cardHtml(pack) {
  return `<button class="card" data-act="open-pack" data-pack="${esc(pack.name)}">
    <div class="thumb">
      <div class="mock">
        <div class="bar" style="background:${esc(pack.accent)};opacity:.55"></div>
        <div class="row"></div><div class="row" style="width:55%"></div>
        <div class="row" style="width:80%;margin-top:auto"></div>
      </div>
      <span class="badge">HTML · light/dark</span>
    </div>
    <div class="meta">
      <div class="title">${esc(pack.displayName)} ${pack.recent ? '<span class="tag">最近</span>' : ""}</div>
      <div class="path">${esc(pack.root)}</div>
      <div class="stats">
        <span>${icon("code", 12)} ${pack.htmlCount} HTML</span>
        <span>${icon("layers", 12)} ${pack.themes.length} 主题</span>
        <span>${icon("file", 12)} ${esc(pack.docBadge)}</span>
      </div>
    </div>
  </button>`;
}

function browseHtml() {
  const pack = currentPack();
  if (!pack) return `<div class="content"><div class="empty"><h3>包不在索引里</h3></div></div>`;
  const screen = screenOf(pack, state.path);
  return `<div class="body">
    ${treeHtml(pack)}
    <div class="preview-pane ${state.mode === "full" ? "full" : ""}">
      <div class="preview-toolbar">
        <span class="pill on">${icon("globe", 12)} HTML 预览</span>
        <span style="flex:1"></span>
        <span class="status"><i class="ok"></i>${screen ? "预览已就绪" : "选择一个 HTML 页面"}</span>
        <button class="tbtn sm ${state.actualSize ? "pri" : ""}" data-act="actual">${icon("eye", 13)}实际尺寸</button>
        <button class="tbtn sm ${state.mode === "full" ? "pri" : ""}" data-act="full">${state.mode === "full" ? "退出全幅" : "全幅预览"}</button>
        <button class="tbtn sm pri" data-act="open-browser" ${screen ? "" : "disabled"}>${icon("ext", 13)}浏览器打开</button>
      </div>
      <div class="preview-stage ${state.actualSize ? "actual" : ""}">
        ${screen ? `<div class="preview-frame">
          <div class="pf-bar"><i></i><i></i><i></i><span>${esc(screen.title)} · ${esc(screen.path)} · 可点击预览</span></div>
          <iframe sandbox="allow-scripts allow-forms allow-popups allow-modals" src="${esc(previewSrc(pack.name, screen.path))}" title="${esc(screen.title)}"></iframe>
        </div>` : `<div class="empty"><h3>没有可预览的 HTML</h3><p>从左侧选择页面。文档会直接进入编辑。</p></div>`}
      </div>
    </div>
    ${state.mode === "full" ? "" : metaHtml(pack, screen)}
  </div>`;
}

function treeHtml(pack) {
  const themes = pack.themes.length ? pack.themes : ["light", "dark"];
  const themeBlocks = themes.map((theme) => themeBlock(pack, theme)).join("");
  return `<div class="tree-pane">
    <div class="tree-h">
      <button class="sw" data-act="pack-menu"><span class="dot" style="background:${esc(pack.accent)}"></span>${esc(pack.name)} ${icon("chev", 12)}</button>
      <button class="iconbtn" style="width:28px;height:28px" title="刷新索引" data-act="refresh">${icon("refresh", 13)}</button>
      ${state.packMenu ? `<div class="menu">${state.data.packs.map((item) => `
        <button class="menu-item" data-act="open-pack" data-pack="${esc(item.name)}"><span class="dot" style="background:${esc(item.accent)};width:8px;height:8px;border-radius:50%"></span>${esc(item.displayName)}</button>`).join("")}</div>` : ""}
    </div>
    <div class="tree-body">
      ${themeBlocks}
      ${docBlock(pack)}
      ${toolsBlock(pack)}
    </div>
  </div>`;
}

function themeBlock(pack, theme) {
  const collapsed = state.collapsed.has(`theme:${theme}`) && !state.query.trim();
  const groups = groupScreens(pack, theme);
  const body = collapsed ? "" : groups.map(([group, screens]) => groupBlock(theme, group, screens)).join("");
  return `<div class="tree-group">
    <button class="gh" data-act="toggle" data-key="theme:${esc(theme)}">${icon(collapsed ? "chevR" : "chev", 12)} 主题 · ${esc(theme)}</button>
    ${body}
  </div>`;
}

function groupScreens(pack, theme) {
  const map = new Map();
  for (const screen of pack.screens) {
    if (screen.theme !== theme) continue;
    if (state.query.trim() && !queryMatch(`${screen.title} ${screen.path} ${screen.group}`)) continue;
    if (!map.has(screen.group)) map.set(screen.group, []);
    map.get(screen.group).push(screen);
  }
  return [...map.entries()];
}

function groupBlock(theme, group, screens) {
  const key = `group:${theme}:${group}`;
  const collapsed = state.collapsed.has(key) && !state.query.trim();
  return `<div class="tree-group">
    <button class="gh" data-act="toggle" data-key="${esc(key)}">${icon(collapsed ? "chevR" : "chev", 12)} ${esc(group)}</button>
    ${collapsed ? "" : screens.map((screen) => `
      <button class="tree-item ${state.path === screen.path ? "on" : ""}" data-act="select" data-path="${esc(screen.path)}">
        ${icon("code", 14)} ${esc(screen.title)}<span class="badge">html</span>
      </button>`).join("")}
  </div>`;
}

function docBlock(pack) {
  const docs = docEntries(pack).filter((doc) => queryMatch(`${doc.title} ${doc.path}`));
  if (!docs.length && state.query.trim()) return "";
  const collapsed = state.collapsed.has("docs") && !state.query.trim();
  return `<div class="tree-group">
    <button class="gh" data-act="toggle" data-key="docs">${icon(collapsed ? "chevR" : "chev", 12)} 文档</button>
    ${collapsed ? "" : docs.map((doc) => `
      <button class="tree-item ${state.path === doc.path ? "on" : ""}" data-act="select" data-path="${esc(doc.path)}">
        ${icon("file", 14)} ${esc(doc.title)}<span class="badge">${esc(doc.badge)}</span>
      </button>`).join("")}
  </div>`;
}

function toolsBlock(pack) {
  if (!pack.tools.length) return "";
  const files = pack.tools.filter((rel) => queryMatch(rel));
  if (!files.length && state.query.trim()) return "";
  const collapsed = state.collapsed.has("tools") && !state.query.trim();
  return `<div class="tree-group">
    <button class="gh" data-act="toggle" data-key="tools">${icon(collapsed ? "chevR" : "chev", 12)} tools/ <span class="badge">可选</span></button>
    ${collapsed ? "" : files.map((rel) => `
      <button class="tree-item ${state.path === rel ? "on" : ""}" data-act="select" data-path="${esc(rel)}">
        ${icon("wand", 14)} ${esc(rel.split("/").pop())}<span class="badge">${esc(rel.split(".").pop())}</span>
      </button>`).join("")}
  </div>`;
}

function metaHtml(pack, screen) {
  if (!screen) {
    return `<aside class="meta-pane"><div class="mh"><h3>${esc(pack.displayName)}</h3><p>${esc(pack.version)} · ${pack.htmlCount} HTML</p></div>
      <div class="sec"><div class="lab">说明</div><div class="val" style="color:var(--text-3)">${esc(pack.description || "选择一个 HTML 页面以预览。")}</div></div>
      ${issueBlock(pack)}</aside>`;
  }
  return `<aside class="meta-pane">
    <div class="mh"><h3>${esc(screen.title)}</h3><p>${esc(screen.id)} · ${esc(screen.theme)} · HTML</p></div>
    <div class="sec"><div class="lab">路径</div><div class="val mono">${esc(screen.path)}</div></div>
    <div class="sec"><div class="lab">资产类型</div><div class="val"><span class="pill on">${icon("code", 12)} HTML 页面</span></div></div>
    <div class="sec"><div class="lab">规格</div><div class="val">1440×900 · 可浏览器打开</div></div>
    <div class="sec"><div class="lab">说明</div><div class="val" style="color:var(--text-3);font-size:12px">${esc(screen.description || pack.description || "包内仅 HTML，无 PNG 资产。")}</div></div>
    ${issueBlock(pack)}
    <div class="acts">
      <button class="tbtn pri" data-act="open-browser">${icon("ext")}在浏览器打开</button>
      <button class="tbtn" data-act="edit">${icon("pen")}编辑</button>
      <button class="tbtn" data-act="regen" ${pack.generator ? "" : "disabled"}>${icon("wand")}重新生成</button>
      <button class="tbtn" data-act="reveal">${icon("folder")}在访达中打开</button>
    </div>
  </aside>`;
}

function issueBlock(pack) {
  const issues = pack.issues.slice(0, 3);
  if (!issues.length) return "";
  return `<div class="sec"><div class="lab">校验</div>${issues.map((issue) => `<div class="issue ${esc(issue.level)}">${esc(issue.message)}</div>`).join("")}</div>`;
}

function editorHtml() {
  const pack = currentPack();
  const tabs = editorTabs(pack, state.editor.path);
  return `<div class="editor">
    <div class="editor-tabs">
      ${tabs.map((tab) => `<button class="tab ${tab.path === state.editor.path ? "on" : ""}" data-act="select" data-path="${esc(tab.path)}">${icon(tab.icon, 14)} ${esc(tab.title)}</button>`).join("")}
    </div>
    <div class="editor-body">
      <div class="code-edit">
        <pre class="gutter" id="gutter"></pre>
        <textarea id="editor" data-path="${esc(state.editor.path)}" spellcheck="false"></textarea>
      </div>
      <aside class="editor-side">${editorSide(pack)}</aside>
    </div>
  </div>`;
}

function editorTabs(pack, current) {
  if (!pack) return [{ path: current, title: current, icon: "file" }];
  if (isDoc(current)) {
    return docEntries(pack).map((doc) => ({ path: doc.path, title: doc.path === "pack.json" ? "pack.json" : doc.title, icon: "file" }));
  }
  const tabs = [];
  if (current.endsWith(".html")) {
    tabs.push({ path: current, title: current, icon: "code" });
    const sibling = current.startsWith("light/")
      ? `dark/${current.slice("light/".length)}`
      : current.startsWith("dark/")
        ? `light/${current.slice("dark/".length)}`
        : "";
    if (sibling && pack.screens.some((screen) => screen.path === sibling)) tabs.push({ path: sibling, title: sibling, icon: "code" });
  } else tabs.push({ path: current, title: current, icon: "wand" });
  if (pack.tools.includes("tools/gen.py") && current !== "tools/gen.py") tabs.push({ path: "tools/gen.py", title: "tools/gen.py", icon: "wand" });
  return tabs;
}

function editorSide(pack) {
  const kind = state.editor.kind;
  if (kind === "html" || kind === "python") {
    const count = pack?.htmlCount || 0;
    return `<div class="callout"><h4>${icon("wand", 14)} 页面级维护</h4><p>本包页面由可选的 <code>tools/gen.py</code> 生成 HTML。改布局后点「保存并重新生成」。</p></div>
      <div class="callout"><h4>${icon("layers", 14)} 影响范围</h4><p>${pack?.generator ? `将按 ${esc(pack.generator.label)} 重写 HTML，共 ${count} 页（无 PNG）。` : "此包没有生成器，保存只写当前文件。"}</p></div>
      <button class="tbtn pri" data-act="regen" ${pack?.generator ? "" : "disabled"}>${icon("wand")}运行生成器</button>
      <button class="tbtn" data-act="reveal">${icon("folder")}打开包目录</button>`;
  }
  const names = (pack?.screens || []).map((screen) => screen.path.split("/").pop());
  const unique = [...new Set(names)].slice(0, 8);
  return `<div class="callout"><h4>${icon("file", 14)} 文档编辑</h4><p>维护包根文档：pack.json、README、FEATURE_MAP、STYLE_GUIDE。保存后索引更新摘要。</p></div>
    <div class="callout"><h4>${icon("code", 14)} 关联页面</h4><p>包内 ${pack?.htmlCount || 0} 个 HTML 界面。</p><div class="pills">${unique.map((name) => `<span class="pill">${esc(name)}</span>`).join("")}</div></div>
    <div class="callout"><h4>${icon("server", 14)} Agent / MCP</h4><p>可通过 MCP <code>update</code> 写入此文档；Web UI 与 Agent 共用同一约定。</p></div>`;
}

function bindEditor() {
  const input = document.getElementById("editor");
  const gutter = document.getElementById("gutter");
  if (!input || input.dataset.bound) return;
  input.dataset.bound = "1";
  input.value = state.editor.draft;
  input.addEventListener("input", () => {
    state.editor.draft = input.value;
    updateGutter();
    const pill = document.getElementById("dirty");
    if (pill) pill.hidden = state.editor.draft === state.editor.original;
  });
  input.addEventListener("scroll", () => { if (gutter) gutter.scrollTop = input.scrollTop; });
  updateGutter();
}

function updateGutter() {
  const input = document.getElementById("editor");
  const gutter = document.getElementById("gutter");
  if (!input || !gutter) return;
  const count = input.value.split("\n").length;
  gutter.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
}

function settingsHtml() {
  const tabs = [
    ["paths", "folder", "资源路径"],
    ["appearance", "layers", "应用外观"],
    ["mcp", "server", "Agent / MCP"],
    ["about", "help", "关于"],
  ];
  return `<div class="settings">
    <div class="set-nav">${tabs.map(([id, name, label]) => `
      <button class="si ${state.settingsTab === id ? "on" : ""}" data-act="settings-tab" data-tab="${id}">${icon(name, 14)}${label}</button>`).join("")}</div>
    <div class="set-body">${settingsBody()}</div>
  </div>`;
}

function settingsBody() {
  if (state.settingsTab === "appearance") return appearanceHtml();
  if (state.settingsTab === "mcp") return mcpHtml();
  if (state.settingsTab === "about") return aboutHtml();
  return pathsHtml();
}

function pathsHtml() {
  const packs = state.data.packs;
  return `<h2>资源路径</h2><p class="desc">索引本地 HTML 设计资产包。修改后需「刷新索引」。</p>
    <div class="form">
      <div class="field">
        <label>资产根目录</label>
        <div class="path-row">
          <input class="mono" id="root-input" value="${esc(state.data.assetRoot)}"/>
          <button class="tbtn" data-act="choose-root">选择…</button>
        </div>
        <div class="hint">扫描含 pack.json（或 README）+ light/ + dark/ 的包；页面仅为 HTML。回车保存当前路径。</div>
      </div>
      <div class="field">
        <label>已发现的包</label>
        <div class="mcp-list">${packs.map((pack) => `
          <button class="mcp-item" data-act="open-pack" data-pack="${esc(pack.name)}">
            <div class="mico">${icon("box")}</div>
            <div><h4>${esc(pack.name)}</h4><p><code>${esc(pack.root)}</code> · ${pack.htmlCount} HTML · ${esc(pack.docBadge)}</p></div>
          </button>`).join("") || `<div class="empty">这个目录下没有资产包</div>`}</div>
      </div>
      <div class="toggle-row">
        <div><div class="tl">应用主题</div><div class="td">Miao Pack 自身界面 · 与「浏览包内 light/dark」相互独立</div></div>
        <button class="switch ${state.data.appTheme === "light" ? "" : "off"}" data-act="theme-app" aria-label="切换应用主题"><i></i></button>
      </div>
      <div class="field">
        <label>Agent / MCP 能力</label>
        ${mcpList()}
      </div>
    </div>`;
}

function appearanceHtml() {
  const theme = state.data.appTheme;
  return `<h2>应用外观</h2><p class="desc">只改变 Miao Pack 自己的浅色或深色。正在浏览的包仍由树里的「主题 · light / dark」决定。</p>
    <div class="form">
      <div class="choices">
        <button class="choice ${theme === "light" ? "on" : ""}" data-act="set-theme" data-theme="light"><b>浅色</b><span>工作台底色 #F2F4F2，强调色 #00B96B。</span></button>
        <button class="choice ${theme === "dark" ? "on" : ""}" data-act="set-theme" data-theme="dark"><b>深色</b><span>窗口 #121212。浏览 dark HTML 不必先切到这里。</span></button>
      </div>
    </div>`;
}

function mcpHtml() {
  const nodeConfig = JSON.stringify({ mcpServers: { "miao-pack": { command: state.data.mcp.command, args: state.data.mcp.args } } }, null, 2);
  const npxConfig = JSON.stringify({ mcpServers: { "miao-pack": state.data.mcp.npx } }, null, 2);
  return `<h2>Agent / MCP</h2><p class="desc">Agent 与 Web UI 读写同一套目录。下面这段配置可粘进 Cursor 的 MCP 设置。</p>
    <div class="form">
      ${mcpList()}
      <div class="field">
        <label>本地命令（构建之后）</label>
        <pre class="config" id="mcp-node">${esc(nodeConfig)}</pre>
        <div class="row-actions"><button class="tbtn" data-act="copy" data-copy="mcp-node">复制</button></div>
      </div>
      <div class="field">
        <label>发布后的 npx</label>
        <pre class="config" id="mcp-npx">${esc(npxConfig)}</pre>
        <div class="row-actions"><button class="tbtn" data-act="copy" data-copy="mcp-npx">复制</button></div>
      </div>
    </div>`;
}

function mcpList() {
  const items = [
    ["layers", "list", "列出已索引包、主题与 HTML 页面"],
    ["eye", "get", "读取文档或页面 HTML 内容 / 元数据"],
    ["pen", "update", "更新 Markdown、pack.json 或生成脚本"],
    ["wand", "regenerate", "触发包内 <code>tools/gen.py</code> 重写 HTML"],
    ["help", "validate", "检查清单、页面路径和生成器"],
  ];
  return `<div class="mcp-list">${items.map(([name, title, text]) => `
    <div class="mcp-item"><div class="mico">${icon(name)}</div><div><h4>${title}</h4><p>${text}</p></div></div>`).join("")}</div>`;
}

function aboutHtml() {
  return `<h2>关于</h2><p class="desc">Miao Pack ${esc(state.data.version)} · HTML 设计资产包的本地浏览器。</p>
    <div class="form">
      <div class="mcp-list">
        <div class="mcp-item"><div class="mico">${icon("stack")}</div><div><h4>npm 包（Web UI）</h4><p>安装后本地 <code>npx miao-pack serve</code> 打开本界面。不是 macOS / Windows 原生二进制。</p></div></div>
        <div class="mcp-item"><div class="mico">${icon("server")}</div><div><h4>MCP（Agent）</h4><p>按约定读写资产包：list / get / update / regenerate / validate。与 Web UI 共用同一目录结构。</p></div></div>
      </div>
      <div class="hint">产品形态 = npm Web UI + MCP 两件套。界面中的桌面窗仅为示意壳。预览只有可点击 HTML，没有 PNG 管线。</div>
    </div>`;
}

function renderDialog() {
  if (!state.dialog) {
    dialogRoot.innerHTML = "";
    return;
  }
  const dialog = state.dialog;
  if (dialog.type === "import") {
    dialogRoot.innerHTML = shell("导入本地包", "填写资产包目录的绝对路径。目录里需要 pack.json，或 README 加上 light/、dark/。", `
      <input class="mono" id="dialog-path" value="${esc(dialog.path)}" placeholder="/path/to/pack"/>`, `
      <button class="tbtn" data-act="close-dialog">取消</button>
      <button class="tbtn pri" data-act="import-go">导入</button>`);
    return;
  }
  if (dialog.type === "root") {
    dialogRoot.innerHTML = shell("资产根目录", "Miao Pack 会扫描这一层目录下的资产包。", `
      <input class="mono" id="dialog-path" value="${esc(dialog.path)}" placeholder="/path/to/assets"/>`, `
      <button class="tbtn" data-act="close-dialog">取消</button>
      <button class="tbtn pri" data-act="save-root">使用该目录</button>`);
    return;
  }
  const pack = currentPack();
  const screen = screenOf(pack, state.path);
  const scope = dialog.scope || "all";
  dialogRoot.innerHTML = shell("重新生成 HTML", "运行包内生成器，只重写 HTML，不产出 PNG。", `
    <div class="row"><span class="k">包</span><span class="v">${esc(pack?.name || "")}</span></div>
    <div class="row"><span class="k">命令</span><span class="v mono">${esc(pack?.generator?.label || "无")}</span></div>
    <div class="row"><span class="k">范围</span><span class="v">
      <select id="regen-scope" ${dialog.running ? "disabled" : ""}>
        <option value="all" ${scope === "all" ? "selected" : ""}>全部 HTML</option>
        ${screen ? `<option value="${esc(screen.id)}" ${scope === screen.id ? "selected" : ""}>屏幕 ${esc(screen.id)}（light 与 dark）</option>` : ""}
      </select>
    </span></div>
    ${dialog.running ? `<div class="prog"><i></i></div><div class="hint">正在生成…</div>` : ""}
    ${dialog.result ? `<div class="prog done"><i></i></div><div class="hint">完成，写了 ${dialog.result.wrote} 个 HTML。</div><pre>${esc(dialog.result.stdout || "")}</pre>` : ""}
    ${dialog.error ? `<div class="issue error">${esc(dialog.error)}</div>` : ""}`, `
    <button class="tbtn" data-act="close-dialog" ${dialog.running ? "disabled" : ""}>${dialog.result ? "关闭" : "取消"}</button>
    <button class="tbtn pri" data-act="regen-go" ${dialog.running || dialog.result ? "disabled" : ""}>开始</button>`);
}

function shell(title, text, body, footer) {
  return `<div class="dim" data-act="close-dialog"><div class="dialog" data-act="noop">
    <div class="dh"><div class="ico">${icon("wand")}</div><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>
    <div class="db">${body}</div>
    <div class="df">${footer}</div>
  </div></div>`;
}

document.body.addEventListener("click", (event) => {
  const actEl = event.target.closest("[data-act]");
  let dirty = false;
  if (state.searchOpen && !event.target.closest(".search")) {
    state.searchOpen = false;
    dirty = true;
  }
  if (state.packMenu && !event.target.closest(".tree-h")) {
    state.packMenu = false;
    dirty = true;
  }
  if (!actEl) {
    if (dirty) render();
    return;
  }
  if (actEl.dataset.act === "noop") {
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  onAction(actEl).catch((error) => {
    toast(error.message);
    if (state.dialog?.type === "regen") {
      state.dialog.running = false;
      state.dialog.error = error.message;
      render();
    }
  });
});

document.body.addEventListener("input", (event) => {
  if (event.target.id === "q") {
    state.query = event.target.value;
    state.searchOpen = true;
    state.searchIndex = 0;
    render();
  } else if (event.target.id === "dialog-path" && state.dialog) {
    state.dialog.path = event.target.value;
  } else if (event.target.id === "root-input") {
    state.rootDraft = event.target.value;
  } else if (event.target.id === "regen-scope" && state.dialog) {
    state.dialog.scope = event.target.value;
  }
});

document.body.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "s" && state.editor) {
    event.preventDefault();
    saveEditor(false).catch((error) => toast(error.message));
    return;
  }
  if (event.target.id === "q") {
    const items = hits();
    if (event.key === "ArrowDown") {
      state.searchIndex = Math.min(items.length - 1, state.searchIndex + 1);
      state.searchOpen = true;
      render();
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      state.searchIndex = Math.max(0, state.searchIndex - 1);
      render();
      event.preventDefault();
    } else if (event.key === "Enter" && items[state.searchIndex]) {
      event.preventDefault();
      openHit(items[state.searchIndex]).catch((error) => toast(error.message));
    } else if (event.key === "Escape") {
      state.searchOpen = false;
      render();
    }
  }
  if (event.target.id === "root-input" && event.key === "Enter") {
    saveRoot(event.target.value).catch((error) => toast(error.message));
  }
  if (event.target.id === "dialog-path" && event.key === "Enter") {
    if (state.dialog?.type === "import") doImport().catch((error) => toast(error.message));
    if (state.dialog?.type === "root") saveRoot(event.target.value).catch((error) => toast(error.message));
  }
});

async function onAction(el) {
  const act = el.dataset.act;
  if (act === "nav-library") {
    if (!confirmDiscard()) return;
    state.view = "library";
    state.mode = "preview";
    state.editor = null;
    state.packMenu = false;
    render();
  } else if (act === "nav-settings") {
    if (!confirmDiscard()) return;
    state.view = "settings";
    state.packMenu = false;
    render();
  } else if (act === "open-pack") {
    await openPack(el.dataset.pack);
  } else if (act === "select") {
    await selectPath(el.dataset.path);
  } else if (act === "toggle") {
    const key = el.dataset.key;
    if (state.collapsed.has(key)) state.collapsed.delete(key);
    else state.collapsed.add(key);
    if (key.startsWith("theme:")) state.browseTheme = key.slice("theme:".length);
    render();
  } else if (act === "theme-app") {
    await setAppTheme(state.data.appTheme === "dark" ? "light" : "dark");
  } else if (act === "set-theme") {
    await setAppTheme(el.dataset.theme);
  } else if (act === "theme-browse") {
    switchBrowseTheme();
  } else if (act === "refresh") {
    state.data = await api("POST", "/api/refresh");
    toast("索引已刷新");
    render();
  } else if (act === "import") {
    state.dialog = { type: "import", path: "" };
    render();
  } else if (act === "import-go") {
    await doImport();
  } else if (act === "choose-root") {
    state.dialog = { type: "root", path: document.getElementById("root-input")?.value || state.data.assetRoot };
    render();
  } else if (act === "save-root") {
    await saveRoot(document.getElementById("dialog-path")?.value || state.dialog?.path || "");
  } else if (act === "close-dialog") {
    if (state.dialog?.running) return;
    state.dialog = null;
    render();
  } else if (act === "settings-tab") {
    state.settingsTab = el.dataset.tab;
    render();
  } else if (act === "pack-menu") {
    state.packMenu = !state.packMenu;
    render();
  } else if (act === "search-hit") {
    await openHit({ pack: el.dataset.pack, path: el.dataset.path });
  } else if (act === "edit") {
    await openEditor(state.path);
  } else if (act === "back-preview") {
    backPreview();
  } else if (act === "save") {
    await saveEditor(false);
  } else if (act === "save-regen") {
    await saveEditor(true);
  } else if (act === "discard") {
    if (!state.editor) return;
    state.editor.draft = state.editor.original;
    const input = document.getElementById("editor");
    if (input) input.value = state.editor.draft;
    updateGutter();
    render();
  } else if (act === "actual") {
    state.actualSize = !state.actualSize;
    render();
  } else if (act === "full") {
    state.mode = state.mode === "full" ? "preview" : "full";
    render();
  } else if (act === "open-browser") {
    if (!state.path || !state.packName) return;
    window.open(new URL(previewSrc(state.packName, state.path), location.origin).href, "_blank", "noopener");
  } else if (act === "reveal") {
    const result = await api("POST", `/api/packs/${encodeURIComponent(state.packName)}/reveal`, { path: state.path || "" });
    toast(result.opened ? `已打开 ${result.path}` : result.path);
  } else if (act === "regen") {
    const pack = currentPack();
    if (!pack?.generator) {
      toast("此包没有生成器");
      return;
    }
    const screen = screenOf(pack, state.path);
    state.dialog = { type: "regen", scope: screen?.id || "all", running: false, error: "", result: null };
    render();
  } else if (act === "regen-go") {
    const scope = document.getElementById("regen-scope")?.value || state.dialog?.scope || "all";
    await runRegen(scope);
  } else if (act === "copy") {
    const node = document.getElementById(el.dataset.copy);
    if (!node) return;
    await navigator.clipboard.writeText(node.textContent || "");
    toast("已复制 MCP 配置");
  }
}

async function openPack(name) {
  const pack = packBy(name);
  if (!pack) return;
  if (state.view === "browse" && state.packName === name && state.mode !== "edit") {
    state.packMenu = false;
    state.dialog = null;
    render();
    return;
  }
  if (!confirmDiscard()) return;
  state.packName = name;
  state.view = "browse";
  state.mode = "preview";
  state.editor = null;
  state.packMenu = false;
  state.dialog = null;
  state.searchOpen = false;
  state.collapsed = new Set(["theme:dark", "tools"]);
  const first = pack.screens.find((screen) => screen.theme === "light") || pack.screens[0];
  state.browseTheme = first?.theme || pack.themes[0] || "light";
  state.path = first?.path || pack.docs.readme || pack.docs.packJson || null;
  if (state.path && !state.path.endsWith(".html")) await openEditor(state.path);
  else render();
}

async function selectPath(rel) {
  if (!rel || !state.packName) return;
  if (state.editor && state.editor.path === rel) return;
  if (!confirmDiscard()) return;
  state.path = rel;
  state.view = "browse";
  const pack = currentPack();
  const screen = screenOf(pack, rel);
  if (screen) {
    state.browseTheme = screen.theme;
    state.collapsed.delete(`theme:${screen.theme}`);
    if (state.mode === "edit") {
      await openEditor(rel);
      return;
    }
    state.editor = null;
    render();
    return;
  }
  await openEditor(rel);
}

async function openHit(hit) {
  state.query = "";
  state.searchOpen = false;
  if (hit.pack !== state.packName) await openPack(hit.pack);
  await selectPath(hit.path);
}

async function openEditor(rel) {
  const file = await api("GET", `/api/packs/${encodeURIComponent(state.packName)}/file?path=${encodeURIComponent(rel)}`);
  state.mode = "edit";
  state.path = file.path;
  state.editor = { path: file.path, original: file.content, draft: file.content, kind: file.kind };
  render();
}

function backPreview() {
  if (!confirmDiscard()) return;
  const pack = currentPack();
  state.mode = "preview";
  state.editor = null;
  if (!state.path?.endsWith(".html")) {
    const screen = pack?.screens.find((item) => item.theme === state.browseTheme) || pack?.screens[0];
    state.path = screen?.path || null;
    if (screen) state.browseTheme = screen.theme;
  }
  render();
}

async function saveEditor(andRegen) {
  if (!state.editor) return;
  await api("PUT", `/api/packs/${encodeURIComponent(state.packName)}/file`, {
    path: state.editor.path,
    content: state.editor.draft,
  });
  state.editor.original = state.editor.draft;
  state.data = await api("GET", "/api/state");
  toast("已保存");
  if (andRegen) {
    const screen = screenOf(currentPack(), state.editor.path);
    await runRegen(screen?.id || "all");
    return;
  }
  render();
}

async function runRegen(scope) {
  state.dialog = { type: "regen", scope, running: true, error: "", result: null };
  render();
  try {
    const result = await api("POST", `/api/packs/${encodeURIComponent(state.packName)}/regenerate`, { scope });
    state.data = await api("GET", "/api/state");
    state.dialog = { type: "regen", scope, running: false, error: "", result };
    toast("已重新生成 HTML");
  } catch (error) {
    state.dialog = { type: "regen", scope, running: false, error: error.message, result: null };
    toast(error.message);
  }
  render();
}

function switchBrowseTheme() {
  const pack = currentPack();
  if (!pack) return;
  if (!confirmDiscard()) return;
  const next = state.browseTheme === "light" ? "dark" : "light";
  if (!pack.themes.includes(next)) return;
  state.browseTheme = next;
  state.collapsed.delete(`theme:${next}`);
  const current = screenOf(pack, state.path);
  if (current) {
    const sibling = pack.screens.find((screen) => screen.theme === next && screen.id === current.id);
    if (sibling) {
      state.path = sibling.path;
      if (state.mode === "edit") state.mode = "preview";
      state.editor = null;
    }
  }
  render();
}

async function setAppTheme(theme) {
  state.data = await api("PUT", "/api/settings", { appTheme: theme });
  applyTheme(theme);
  render();
}

async function doImport() {
  const target = document.getElementById("dialog-path")?.value || state.dialog?.path || "";
  state.data = await api("POST", "/api/import", { path: target });
  state.dialog = null;
  state.view = "library";
  toast("已导入");
  render();
}

async function saveRoot(value) {
  state.data = await api("PUT", "/api/settings", { assetRoot: value });
  state.dialog = null;
  state.view = state.view === "browse" ? "library" : state.view;
  toast("资产根目录已更新");
  render();
}

async function boot() {
  try {
    state.data = await api("GET", "/api/state");
    applyTheme(state.data.appTheme);
    render();
  } catch (error) {
    stage.innerHTML = `<div class="content"><div class="empty"><h3>无法加载索引</h3><p>${esc(error.message)}</p></div></div>`;
  }
}

setInterval(async () => {
  if (!state.data) return;
  if (state.editor && state.editor.draft !== state.editor.original) return;
  if (state.dialog?.running) return;
  try {
    const next = await api("GET", "/api/state");
    if (next.revision !== state.data.revision || next.packCount !== state.data.packCount) {
      const keepPath = state.path;
      state.data = next;
      if (state.packName && !packBy(state.packName)) {
        state.view = "library";
        state.packName = null;
      }
      state.path = keepPath;
      render();
    }
  } catch {
    /* the next poll retries */
  }
}, 5000);

boot();
