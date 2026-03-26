#!/usr/bin/env python3
"""
最小内容流水线：抓取单页 → Claude 结构化 → 写 MDX → 可选 git commit & push。
用法见 openclaw/README.md
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import anthropic
import requests
import yaml
from bs4 import BeautifulSoup
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
OPENCLAW_DIR = Path(__file__).resolve().parent


def load_env() -> None:
    load_dotenv(REPO_ROOT / ".env.local")
    load_dotenv(REPO_ROOT / ".env")


def slugify(text: str, max_len: int = 60) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\u4e00-\u9fff]+", "-", s, flags=re.UNICODE)
    s = re.sub(r"-+", "-", s).strip("-")
    if not s:
        s = "article"
    return s[:max_len].rstrip("-")


def fetch_article(url: str) -> tuple[str, str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; OpenClaw-MVP/1.0; +https://example.invalid)",
        "Accept": "text/html,application/xhtml+xml",
    }
    r = requests.get(url, timeout=45, headers=headers)
    r.raise_for_status()
    r.encoding = r.encoding or "utf-8"
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    title_el = soup.find("title")
    title = (title_el.get_text(strip=True) if title_el else "") or "Untitled"
    main = soup.find("article") or soup.find("main") or soup.body
    if not main:
        return title, ""
    for noise in main.find_all(["nav", "footer", "aside", "form"]):
        noise.decompose()
    text = main.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return title.strip(), text[:22000]


def get_api_key() -> str:
    return (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY") or "").strip()


def get_model() -> str:
    return os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022").strip()


def build_prompt(source_name: str, page_url: str, raw_title: str, body: str) -> str:
    return f"""你是一名 AI 行业编辑。下面是某网页抓取的标题与正文片段。请输出**仅一段 JSON**（不要 markdown 代码围栏），字段必须齐全。

字段说明：
- title: 中文标题（可适当精炼）
- slug: 英文小写短横线 slug，基于主题，40 字符内，只含 a-z0-9-
- summary: 中文一句话摘要，80–200 字
- sources: 字符串数组，至少包含 "{source_name}"
- labels: 3–6 个标签对象数组，每个对象包含：
  - type: 标签类型（从建议集合中选：公司/任务/技术/主题/应用/政策/资本/安全合规 ；确保至少包含 2 种不同 type，避免全堆同一种）
  - value: 标签值（例如公司名/任务名/技术名/主题短语）
- track: 赛道，如：基础模型、开发者工具、行业动态、应用层、政策监管、芯片算力 等选一
- impactType: 影响类型，如：产品能力升级、融资并购、政策、论文技术、市场观点、安全合规 等选一
- sentiment: 仅 positive / neutral / negative
- confidence: 0~1 小数，表示你对事实与来源可靠性的置信度（单源消息勿高于 0.82）
- relatedArticles: 字符串数组，暂无关联则 []
- body_md: 正文为 MDX 片段，必须包含：
  <AIAbstract>...</AIAbstract>
  然后 ## 洞察
  接着三个块：<Insight title="短期">...</Insight> <Insight title="中期">...</Insight> <Insight title="风险">...</Insight>
- publishAt: ISO 8601 时间字符串（如果无法从页面推断，使用抓取当天时间也可以）
  全部正文用中文，简洁有信息密度。

源页面 URL（写入时请不要再重复大段原文）: {page_url}
抓取标题: {raw_title}
正文片段:
---
{body}
---
"""


def call_claude(prompt: str) -> dict:
    api_key = get_api_key()
    if not api_key:
        raise SystemExit("缺少 ANTHROPIC_API_KEY 或 CLAUDE_API_KEY")

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=get_model(),
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = ""
    for block in msg.content:
        if block.type == "text":
            text += block.text
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def to_iso_date() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def write_mdx(data: dict, dest_dir: Path, file_stem: str) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    fm = {
        "title": data["title"],
        "slug": data["slug"],
        "date": data.get("date") or to_iso_date(),
        "publishAt": data.get("publishAt") or data.get("date") or to_iso_date(),
        "summary": data["summary"],
        "sources": data["sources"],
        "labels": data.get("labels") or [],
        "track": data["track"],
        "impactType": data["impactType"],
        "sentiment": data["sentiment"],
        "confidence": float(data["confidence"]),
        "relatedArticles": data.get("relatedArticles") or [],
        "originalUrl": data["originalUrl"],
    }
    header = yaml.dump(
        fm,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
    ).strip()
    body = (data.get("body_md") or "").strip()
    doc = f"---\n{header}\n---\n\n{body}\n"
    path = dest_dir / f"{file_stem}.mdx"
    path.write_text(doc, encoding="utf-8")
    return path


def git_commit_push(paths: list[Path]) -> None:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    owner = os.environ.get("GITHUB_OWNER", "").strip()
    repo = os.environ.get("GITHUB_REPO", "").strip()
    branch = os.environ.get("GITHUB_BRANCH", "main").strip()

    if not token or not owner or not repo:
        print("未设置 GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO，跳过 git push。", file=sys.stderr)
        return

    rel = [str(p.relative_to(REPO_ROOT)) for p in paths]
    subprocess.run(["git", "-C", str(REPO_ROOT), "add", *rel], check=True)
    st = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "diff", "--cached", "--quiet"],
        capture=True,
    )
    if st.returncode == 0:
        print("没有变更需要提交。")
        return

    msg = f"content: auto ingest {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    subprocess.run(
        ["git", "-C", str(REPO_ROOT), "commit", "-m", msg],
        check=True,
    )
    remote_url = f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"
    subprocess.run(
        ["git", "-C", str(REPO_ROOT), "push", remote_url, f"HEAD:{branch}"],
        check=True,
    )
    print(f"已推送到 {owner}/{repo} ({branch})")


def main() -> None:
    parser = argparse.ArgumentParser(description="OpenClaw MVP: fetch + Claude + MDX + git")
    parser.add_argument(
        "--source-index",
        type=int,
        default=0,
        help="sources.json 中使用的条目下标（默认 0）",
    )
    parser.add_argument("--no-push", action="store_true", help="只写文件，不 git push")
    parser.add_argument("--dry-run", action="store_true", help="只抓取并打印，不调 Claude、不写文件")
    args = parser.parse_args()

    load_env()
    sources_path = OPENCLAW_DIR / "sources.json"
    sources = json.loads(sources_path.read_text(encoding="utf-8"))
    if not sources:
        raise SystemExit("sources.json 为空，请至少配置一个 {name, url}")
    entry = sources[args.source_index]
    name, url = entry["name"], entry["url"]

    print(f"抓取: {name} → {url}")
    raw_title, body = fetch_article(url)
    if args.dry_run:
        print(f"标题: {raw_title}\n正文长度: {len(body)}")
        return

    prompt = build_prompt(name, url, raw_title, body)
    print("调用 Claude…")
    data = call_claude(prompt)

    if "slug" not in data:
        data["slug"] = slugify(data.get("title", "article"))

    # 以我们已知的“正文来源 URL”为准
    data["originalUrl"] = url

    data.setdefault("date", to_iso_date())
    if not data.get("publishAt"):
        data["publishAt"] = data["date"]
    if not data.get("labels"):
        # 最小兜底：至少给一个标签，保证通过 frontmatter 校验
        data["labels"] = [{"type": "主题", "value": str(data.get("impactType", "信息"))}]
    # 清洗 labels 形状（至少含 type/value）
    cleaned = []
    for item in data.get("labels", []):
        if not isinstance(item, dict):
            continue
        t = str(item.get("type", "")).strip()
        v = str(item.get("value", "")).strip()
        if t and v:
            cleaned.append({"type": t, "value": v})
    data["labels"] = cleaned or data["labels"]
    threshold = float(os.environ.get("CONFIDENCE_NEED_REVIEW", "0.7"))
    conf = float(data.get("confidence", 0))
    sub = "review" if conf < threshold else "daily"
    dest = REPO_ROOT / "content" / sub
    stem = f"{datetime.now(timezone.utc).strftime('%Y-%m-%d')}-{data['slug']}"
    out = write_mdx(data, dest, stem)
    print(f"已写入: {out.relative_to(REPO_ROOT)} (confidence={conf:.2f} → {sub})")

    if not args.no_push:
        git_commit_push([out])


if __name__ == "__main__":
    main()
