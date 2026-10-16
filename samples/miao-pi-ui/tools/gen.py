#!/usr/bin/env python3
"""Rewrite this pack's light/ and dark/ HTML from pack.json. HTML only — no PNG."""

from __future__ import annotations

import argparse
import html
import json
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description="Regenerate pack HTML")
    parser.add_argument("--screen", default="", help="Only rewrite this screen id")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "pack.json").read_text(encoding="utf-8"))
    screens = manifest.get("screens") or []
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    wrote = 0
    for screen in screens:
        if args.screen and screen.get("id") != args.screen:
            continue
        rel = screen["path"]
        dest = (ROOT / rel).resolve()
        if not dest.is_relative_to(ROOT.resolve()):
            raise SystemExit(f"refusing to write outside pack: {rel}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(render(screen, screens, manifest, generated), encoding="utf-8")
        print(f"wrote {rel}")
        wrote += 1
    if wrote == 0:
        raise SystemExit("no screens matched")
    print(f"done {wrote} html")


def render(screen: dict, screens: list, manifest: dict, generated: str) -> str:
    theme = screen.get("theme") or "light"
    dark = theme == "dark"
    accent = manifest.get("accent") or "#00B96B"
    bg = "#141614" if dark else "#F3F5F3"
    panel = "#1C1E1C" if dark else "#FFFFFF"
    text = "#F2F4F2" if dark else "#1A1D1A"
    muted = "#8E988E" if dark else "#667066"
    line = "rgba(255,255,255,0.08)" if dark else "rgba(0,0,0,0.08)"
    side = "#191B19" if dark else "#E7EBE7"
    title = html.escape(screen.get("title") or "页面")
    desc = html.escape(screen.get("description") or "")
    pack = html.escape(manifest.get("displayName") or manifest.get("name") or "Pack")
    nav = []
    current_parent = str(Path(screen["path"]).parent)
    last_group = None
    for item in screens:
        if item.get("theme") != theme:
            continue
        group = item.get("group") or "页面"
        if group != last_group:
            nav.append(f'<div class="g">{html.escape(group)}</div>')
            last_group = group
        href = os.path.relpath(item["path"], start=current_parent)
        on = " on" if item["path"] == screen["path"] else ""
        nav.append(f'<a class="{on.strip()}" href="{html.escape(href)}">{html.escape(item.get("title") or "")}</a>')
    themed = [item for item in screens if item.get("theme") == theme]
    index = next((i for i, item in enumerate(themed) if item["path"] == screen["path"]), 0)
    nxt_item = themed[(index + 1) % len(themed)] if themed else screen
    nxt = os.path.relpath(nxt_item["path"], start=current_parent)
    overlay = screen.get("group") == "弹出层"
    main = overlay_main(title, desc, accent, nxt) if overlay else page_main(title, desc, accent, nxt)
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>{title}</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,"PingFang SC","Noto Sans SC",sans-serif;background:{bg};color:{text};min-height:100vh;display:flex}}
aside{{width:220px;background:{side};border-right:1px solid {line};padding:18px 12px;flex:none}}
.brand{{font-weight:650;font-size:13px;margin-bottom:14px}}
.brand span{{display:block;color:{muted};font-weight:500;font-size:11px;margin-top:3px}}
.g{{font-size:11px;color:{muted};padding:10px 8px 4px}}
a{{display:block;padding:6px 8px;border-radius:6px;color:{text};text-decoration:none;font-size:13px}}
a.on{{background:color-mix(in srgb,{accent} 18%, transparent);color:{accent};font-weight:600}}
main{{flex:1;padding:28px 32px;min-width:0}}
h1{{font-size:22px;letter-spacing:-.03em}}
p.lead{{color:{muted};margin:8px 0 18px;line-height:1.5;max-width:560px}}
.card{{background:{panel};border:1px solid {line};border-radius:10px;padding:16px;max-width:640px}}
.bar{{height:8px;border-radius:4px;background:{accent};width:34%;opacity:.8;margin-bottom:12px}}
.row{{height:8px;border-radius:4px;background:{line};margin-top:8px}}
button,a.btn{{display:inline-flex;margin-top:16px;background:{accent};color:#fff;border:0;border-radius:6px;padding:8px 12px;font-weight:600;text-decoration:none}}
footer{{margin-top:22px;color:{muted};font-size:12px}}
.stage{{position:relative;min-height:420px;background:{panel};border:1px solid {line};border-radius:10px;overflow:hidden}}
.dim{{position:absolute;inset:0;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center}}
.dlg{{width:320px;background:{panel};border:1px solid {line};border-radius:12px;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,.16)}}
</style>
</head>
<body>
<aside>
  <div class="brand">{pack}<span>{html.escape(theme)} · HTML</span></div>
  {''.join(nav)}
</aside>
<main>
  {main}
  <footer>生成于 {html.escape(generated)} · 仅 HTML，无 PNG</footer>
</main>
</body>
</html>
"""


def page_main(title: str, desc: str, accent: str, nxt: str) -> str:
    return f"""<h1>{title}</h1><p class="lead">{desc}</p>
<div class="card"><div class="bar"></div><div class="row" style="width:80%"></div><div class="row" style="width:62%"></div>
<a class="btn" href="{html.escape(nxt)}">打开下一页</a></div>"""


def overlay_main(title: str, desc: str, accent: str, nxt: str) -> str:
    return f"""<h1>{title}</h1><p class="lead">{desc}</p>
<div class="stage"><div class="dim"><div class="dlg"><h2 style="font-size:16px">{title}</h2><p style="margin-top:8px;line-height:1.45">{desc}</p><a class="btn" href="{html.escape(nxt)}">确认</a></div></div></div>"""


if __name__ == "__main__":
    main()
