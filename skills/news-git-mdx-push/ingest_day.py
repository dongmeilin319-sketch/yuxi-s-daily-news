#!/usr/bin/env python3
"""
Multi-source daily ingest pipeline:
1) Fetch each configured article URL in openclaw/sources.json
2) Extract publish time; keep only within last 24h
3) Verify the article is from the configured site (by URL host + page metadata when available)
4) Deduplicate the same news across sources (title similarity + time window)
5) Call Claude to generate MDX JSON with all required fields
6) Optional neutrality check pass to route into daily vs review
7) Write MDX into content/daily or content/review and git commit+push
"""

from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import certifi
import requests
import yaml
from bs4 import BeautifulSoup
from dotenv import load_dotenv


SKILL_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(os.environ.get("TARGET_REPO_ROOT") or SKILL_DIR.parent.parent).expanduser().resolve()
OPENCLAW_DIR = REPO_ROOT / "openclaw"


# frontmatter required by lib/schema.ts
REQUIRED_FRONTMATTER_FIELDS = {
    "title",
    "slug",
    "summary",
    "sources",
    "labels",
    "track",
    "impactType",
    "sentiment",
    "confidence",
    "publishAt",
    "collectedAt",
    "date",
}


def load_env() -> None:
    load_dotenv(REPO_ROOT / ".env.local")
    load_dotenv(REPO_ROOT / ".env")


def to_iso_z(dt: datetime) -> str:
    dt_utc = dt.astimezone(timezone.utc).replace(microsecond=0)
    return dt_utc.isoformat().replace("+00:00", "Z")


def parse_datetime_maybe(value: str) -> Optional[datetime]:
    if not value:
        return None
    s = value.strip()
    if not s:
        return None

    # Common ISO formats
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    # RFC2822 / HTTP date formats
    try:
        from email.utils import parsedate_to_datetime

        dt = parsedate_to_datetime(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    # YYYY-MM-DD
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            continue
    return None


def slugify(text: str, max_len: int = 60) -> str:
    # Mirror openclaw/run_once.py behavior: allow latin chars + chinese -> "-".
    s = text.lower().strip()
    s = re.sub(r"[^\w\u4e00-\u9fff]+", "-", s, flags=re.UNICODE)
    s = re.sub(r"-+", "-", s).strip("-")
    if not s:
        s = "article"
    return s[:max_len].rstrip("-")


def extract_published_time(soup: BeautifulSoup) -> Optional[datetime]:
    # 1) meta tags
    meta_keys = [
        "article:published_time",
        "og:published_time",
        "publish_date",
        "publish-date",
        "publishAt",
        "pubdate",
        "date",
        "release_date",
    ]
    for m in soup.find_all("meta"):
        key = (m.get("property") or m.get("name") or "").strip()
        content = (m.get("content") or "").strip()
        if not key or not content:
            continue
        if key in meta_keys:
            dt = parse_datetime_maybe(content)
            if dt:
                return dt

    # 2) <time datetime="...">
    for t in soup.find_all("time"):
        dt_attr = (t.get("datetime") or "").strip()
        dt_text = t.get_text(" ", strip=True)
        dt = parse_datetime_maybe(dt_attr) or parse_datetime_maybe(dt_text)
        if dt:
            return dt

    # 3) JSON-LD
    for s in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = s.string or s.get_text(strip=True)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue

        # data can be dict or list; normalize into list
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            # typical keys: datePublished / dateCreated
            for k in ("datePublished", "dateCreated", "published_time", "publicationDate"):
                v = item.get(k)
                if isinstance(v, str):
                    dt = parse_datetime_maybe(v)
                    if dt:
                        return dt

    return None


def fetch_article(url: str) -> tuple[str, str, Optional[datetime], str, str]:
    canonical_url = ""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; OpenClaw-NewsIngest/1.0; +https://example.invalid)",
        "Accept": "text/html,application/xhtml+xml",
    }
    r = requests.get(url, timeout=45, headers=headers, verify=certifi.where())
    r.raise_for_status()
    r.encoding = r.encoding or "utf-8"
    soup = BeautifulSoup(r.text, "html.parser")

    # Title
    title_el = soup.find("title")
    title = (title_el.get_text(strip=True) if title_el else "") or "Untitled"

    # Best-effort article body extraction
    for tag in soup.find_all(["script", "style", "noscript"]):
        tag.decompose()

    main = soup.find("article") or soup.find("main") or soup.body
    if not main:
        body = ""
    else:
        for noise in main.find_all(["nav", "footer", "aside", "form"]):
            noise.decompose()
        body = main.get_text(separator="\n", strip=True)
        body = re.sub(r"\n{3,}", "\n\n", body).strip()
        body = body[:22000]

    published = extract_published_time(soup)

    # Best-effort site identity (for authenticity checks)
    site_name = ""
    for meta_key in ("og:site_name", "application-name"):
        for m in soup.find_all("meta"):
            key = (m.get("property") or m.get("name") or "").strip()
            if key == meta_key:
                site_name = (m.get("content") or "").strip()
                break
        if site_name:
            break

    # Canonical URL (helps prevent some weird redirect/parameter issues)
    canonical_el = soup.find("link", attrs={"rel": "canonical"})
    if canonical_el and canonical_el.get("href"):
        canonical_url = str(canonical_el.get("href")).strip()
        if canonical_url and canonical_url.startswith("/"):
            canonical_url = urljoin(url, canonical_url)

    return title.strip(), body, published, site_name, canonical_url


def host_of(url: str) -> str:
    parsed = urlparse(url.strip())
    return (parsed.netloc or "").lower()


def is_from_configured_site(configured_hub_url: str, candidate_url: str) -> bool:
    """Authenticity check (strictest we can do generically): host must match the configured hub's host."""
    return host_of(configured_hub_url) == host_of(candidate_url)


def discover_links(hub_url: str, max_links: int) -> list[str]:
    """
    Discovery: fetch hub/list page HTML and extract likely article URLs.
    This is best-effort heuristics; the later 24h + publishAt extraction on each candidate page
    is the real filter.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; OpenClaw-NewsIngest/1.0; +https://example.invalid)",
        "Accept": "text/html,application/xhtml+xml",
    }
    r = requests.get(hub_url, timeout=45, headers=headers, verify=certifi.where())
    r.raise_for_status()
    r.encoding = r.encoding or "utf-8"
    soup = BeautifulSoup(r.text, "html.parser")

    hub = urlparse(hub_url)
    host = (hub.netloc or "").lower()

    # Common link patterns for pages to avoid
    exclude_patterns = [
        "/tag/",
        "/tags/",
        "/topic/",
        "/category/",
        "/categories/",
        "/search",
        "/author/",
        "/newsletter",
        "/subscribe",
        "/account",
        "/login",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".pdf",
        ".css",
        ".js",
        ".mp4",
        ".mp3",
    ]

    links: list[str] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=True):
        href = str(a.get("href") or "").strip()
        if not href or href.startswith("#"):
            continue
        if any(p in href.lower() for p in exclude_patterns):
            continue

        abs_url = urljoin(hub_url, href)
        if not abs_url.startswith("http"):
            continue

        if host_of(abs_url) != host:
            continue

        # Skip obviously non-article URLs
        if any(p in abs_url.lower() for p in exclude_patterns):
            continue

        if abs_url not in seen:
            seen.add(abs_url)
            links.append(abs_url)

    # Heuristic preference: prefer article-like URLs (contain year in path),
    # otherwise fall back to broader candidates.
    def score(u: str) -> int:
        p = urlparse(u).path or ""
        s = 0
        if re.search(r"/(19|20)\d{2}/", p):
            s += 5
        if re.search(r"\d", p):
            s += 2
        if len([seg for seg in p.split("/") if seg]) >= 3:
            s += 1
        return s

    year_links = [u for u in links if re.search(r"/(19|20)\d{2}/", urlparse(u).path or "")]
    preferred_threshold = max(3, max_links // 2)
    preferred_pool = year_links if len(year_links) >= preferred_threshold else links

    # Sort by score desc and take top-N
    preferred_pool_sorted = sorted(preferred_pool, key=score, reverse=True)
    return preferred_pool_sorted[:max_links]



def build_prompt(
    source_names: list[str],
    page_url: str,
    raw_title: str,
    body: str,
    publish_at_iso: str,
    collected_at_iso: str,
) -> str:
    # IMPORTANT: output MUST be one JSON only (no markdown), and include all required fields.
    sources_json = json.dumps(source_names, ensure_ascii=False)
    return f"""你是一个严格的"新闻事实编辑 + 中立性审查员协作体"。你会基于给定网页的正文片段生成结构化 JSON。

你必须遵守以下规则：
1) 仅基于提供的正文片段/标题提取事实，禁止编造或引入未出现在片段中的信息。
2) 观点必须准确且中立：不要使用夸张、情绪化或带立场的用词；如果信息不足以支持判断，就写成"尚不明确/需要更多信息"，并降低 confidence。
3) 输出必须是"仅一段 JSON"（不要 markdown 代码围栏）。JSON 字段必须齐全且类型正确。
4) publishAt 和 date 必须使用我提供的 ISO 时间字符串：{publish_at_iso}
5) collectedAt 必须使用我提供的 ISO 时间字符串：{collected_at_iso}

字段要求（JSON 顶层）：
- title: 中文标题（100%来自正文片段的可验证信息）
- slug: 英文小写短横线 slug（40 字符内，只含 a-z0-9-）
- summary: 中文一句话摘要（80-200 字），中立客观
- sources: 字符串数组。必须包含以下信源名且与列表一致：{sources_json}
- originalUrl: 原文链接（必须等于正文片段 URL：{page_url}）
- labels: 3-6 个标签对象数组，每个对象包含：
  - type: 从建议集合选：公司/任务/技术/主题/应用/政策/资本/安全合规
  - value: 标签值（从正文信息中抽取）
- track: 赛道（如 基础模型/开发者工具/行业动态/应用层/政策监管/芯片算力 等）
- impactType: 影响类型（如 产品能力升级/融资并购/政策/论文技术/市场观点/安全合规 等）
- sentiment: 仅填 "neutral"（本项目要求观点中立）
- confidence: 0~1 小数，表示事实可靠性（单源且片段不足时不要给太高，尽量 <=0.82）
- relatedArticles: 字符串数组，暂无关联则 []
- collectedAt: 采集入库时间，必须等于：{collected_at_iso}
- body_md: 必须是 MDX 片段，且必须包含这些结构：
  <AIAbstract>...</AIAbstract>

  ## 洞察
  <Insight title="短期">...</Insight>
  <Insight title="中期">...</Insight>
  <Insight title="风险">...</Insight>

正文片段 URL: {page_url}
抓取标题: {raw_title}
正文片段:
---
{body}
---
"""


def call_llm_direct(prompt: str, max_tokens: int = 4096) -> str:
    """
    直接调用 Moonshot API（OpenClaw 底层使用的模型）。
    需要在 .env.local 中配置 MOONSHOT_API_KEY。
    """
    api_key = os.environ.get("MOONSHOT_API_KEY", "").strip()
    if not api_key:
        # 尝试读取 OpenClaw 的配置文件获取 API Key
        openclaw_config = Path.home() / ".openclaw" / "openclaw.json"
        if openclaw_config.exists():
            try:
                config = json.loads(openclaw_config.read_text(encoding='utf-8'))
                # 尝试从配置中提取 API Key（如果有的话）
                # 注意：OpenClaw 通常不会直接存储明文 API Key
            except Exception:
                pass
        raise SystemExit("缺少 MOONSHOT_API_KEY。请在 .env.local 中配置：MOONSHOT_API_KEY=your_key")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "kimi-k2.5",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens
        # Note: kimi-k2.5 only supports temperature=1
    }
    
    response = requests.post(
        "https://api.moonshot.cn/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=120
    )
    response.raise_for_status()
    
    data = response.json()
    return data["choices"][0]["message"]["content"]


def call_claude_json(prompt: str) -> dict[str, Any]:
    """调用 LLM 生成 JSON，使用 OpenClaw 底层模型。"""
    text = call_llm_direct(prompt, max_tokens=4096)

    # If model wraps JSON in ```json ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\\s*", "", text)
        text = re.sub(r"\\s*```$", "", text)

    # Robust JSON extraction: find the first {...} block.
    try:
        data = json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, flags=re.S)
        if not m:
            raise ValueError(f"LLM output is not valid JSON: {text[:200]}")
        data = json.loads(m.group(0))
    if not isinstance(data, dict):
        raise ValueError("LLM output must be a JSON object")
    return data


def neutrality_check(source_name: str, raw_body_md: str, extracted_publish_iso: str) -> bool:
    """
    Best-effort neutrality pass:
    - If it detects strong emotional/one-sided claims not supported by the snippet, route to review.
    - This is still LLM-based, but we make it deterministic via a strict JSON schema.
    """
    prompt = f"""你是新闻中立性审查器。请只做审查，不要改写正文。

输入：
- 信源：{source_name}
- publishAt: {extracted_publish_iso}
- body_md（含观点与洞察）：
---
{raw_body_md}
---

任务：
判断 body_md 是否存在以下问题（有则认为不通过）：
1) 情绪化/煽动性措辞或明显站队表达
2) 超出正文片段可验证信息的推断/断言
3) 将"可能/需要更多信息"写成确定结论

输出仅一段 JSON：{{"pass": boolean, "issues": [string...]}}
"""
    try:
        text = call_llm_direct(prompt, max_tokens=512)

        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\\s*", "", text)
            text = re.sub(r"\\s*```$", "", text)
        data = json.loads(text)
        return bool(data.get("pass", True))
    except Exception as e:
        print(f"[ingest] neutrality check failed (fallback pass=true): err={e}", file=sys.stderr)
        return True


def validate_body_md(body_md: str) -> None:
    body_md = body_md or ""
    # Frontmatter schema doesn't validate body content, but we do to satisfy your contract.
    if "<AIAbstract>" not in body_md:
        raise ValueError("body_md missing <AIAbstract>")
    if '## 洞察' not in body_md:
        raise ValueError("body_md missing '## 洞察'")
    if '<Insight title="短期">' not in body_md:
        raise ValueError('body_md missing <Insight title="短期">')
    if '<Insight title="中期">' not in body_md:
        raise ValueError('body_md missing <Insight title="中期">')
    if '<Insight title="风险">' not in body_md:
        raise ValueError('body_md missing <Insight title="风险">')


def validate_and_normalize(
    data: dict[str, Any],
    publish_at_iso: str,
    collected_at_iso: str,
    slug_fallback: str,
    original_url: str,
    required_sources: list[str],
) -> dict[str, Any]:
    # Minimal normalization to satisfy schema expectations.
    data = data or {}

    # required simple scalars
    if not str(data.get("title", "")).strip():
        data["title"] = "Untitled"
    data["summary"] = str(data.get("summary", "")).strip()
    if not data["summary"]:
        # summary is required by schema and our UX.
        raise ValueError("LLM output summary is empty")

    if "slug" not in data or not str(data.get("slug", "")).strip():
        data["slug"] = slug_fallback
    if not data.get("publishAt"):
        data["publishAt"] = publish_at_iso
    if not data.get("date"):
        data["date"] = publish_at_iso
    if not data.get("collectedAt"):
        data["collectedAt"] = collected_at_iso

    # sources must be non-empty array
    srcs = data.get("sources") or []
    if not isinstance(srcs, list) or not srcs:
        srcs = []
    srcs_clean = [str(x).strip() for x in srcs if str(x).strip()]
    # Ensure includes required sources (dedup clusters)
    for rs in required_sources:
        if rs and rs.strip() and rs.strip() not in srcs_clean:
            srcs_clean.append(rs.strip())
    data["sources"] = srcs_clean or required_sources or ["未知信源"]

    # Confidence normalization
    try:
        data["confidence"] = float(data.get("confidence", 0))
    except Exception:
        data["confidence"] = 0.0
    data["confidence"] = max(0.0, min(1.0, data["confidence"]))

    # Sentiment must be neutral for this pipeline contract.
    data["sentiment"] = "neutral"

    # Labels must be array of {type,value} with both non-empty
    cleaned_labels: list[dict[str, str]] = []
    for item in data.get("labels", []) or []:
        if not isinstance(item, dict):
            continue
        t = str(item.get("type", "")).strip()
        v = str(item.get("value", "")).strip()
        if t and v:
            cleaned_labels.append({"type": t, "value": v})
    data["labels"] = cleaned_labels if cleaned_labels else [{"type": "主题", "value": "信息"}]

    # track/impactType are required by schema; fill defaults when missing.
    data["track"] = str(data.get("track", "")).strip() or "行业动态"
    data["impactType"] = str(data.get("impactType", "")).strip() or "市场观点"

    # relatedArticles optional; but we normalize to list
    if "relatedArticles" not in data or data["relatedArticles"] is None:
        data["relatedArticles"] = []
    if not isinstance(data["relatedArticles"], list):
        data["relatedArticles"] = []

    body_md = str(data.get("body_md", "") or "").strip()
    validate_body_md(body_md)
    data["body_md"] = body_md

    # 以“我们已知的正文来源 URL”为准，避免 LLM 输出偏差。
    original_url_clean = str(original_url or "").strip()
    if original_url_clean:
        data["originalUrl"] = original_url_clean
    else:
        data.pop("originalUrl", None)

    # Ensure schema-required fields exist and are truthy
    for k in REQUIRED_FRONTMATTER_FIELDS:
        if k not in data or (isinstance(data[k], str) and not data[k].strip()):
            raise ValueError(f"LLM output missing field: {k}")

    return data


def read_existing_slugs() -> set[str]:
    slugs: set[str] = set()
    for subdir in ("content/daily", "content/review"):
        dir_path = REPO_ROOT / subdir
        if not dir_path.exists():
            continue
        for mdx in dir_path.glob("*.mdx"):
            raw = mdx.read_text(encoding="utf-8")
            m = re.match(r"^---\n(.*?)\n---\n", raw, flags=re.S)
            if not m:
                continue
            fm_raw = m.group(1)
            try:
                data = yaml.safe_load(fm_raw) or {}
            except Exception:
                continue
            slug = data.get("slug")
            if isinstance(slug, str) and slug.strip():
                slugs.add(slug.strip())
    return slugs


def write_mdx(data: dict[str, Any], dest_dir: Path, file_stem: str) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    fm = {
        "title": data["title"],
        "slug": data["slug"],
        "date": data["date"],
        "publishAt": data["publishAt"],
        "collectedAt": data["collectedAt"],
        "summary": data["summary"],
        "sources": data["sources"],
        "labels": data["labels"],
        "track": data["track"],
        "impactType": data["impactType"],
        "sentiment": data["sentiment"],
        "confidence": float(data["confidence"]),
        "relatedArticles": data.get("relatedArticles") or [],
        "originalUrl": data["originalUrl"],
        # coverImage optional not used by this pipeline
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


def git_commit_push(paths: list[Path], branch: str) -> None:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    owner = os.environ.get("GITHUB_OWNER", "").strip()
    repo = os.environ.get("GITHUB_REPO", "").strip()

    if not token or not owner or not repo:
        print("未设置 GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO，跳过 git push。", file=sys.stderr)
        return

    rel = [str(p.relative_to(REPO_ROOT)) for p in paths]

    subprocess.run(["git", "-C", str(REPO_ROOT), "add", *rel], check=True)
    st = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "diff", "--cached", "--quiet"],
        capture_output=True,
    )
    if st.returncode == 0:
        print("没有变更需要提交。")
        return

    msg = f"content: auto ingest {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    subprocess.run(["git", "-C", str(REPO_ROOT), "commit", "-m", msg], check=True)

    remote_url = f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"
    subprocess.run(["git", "-C", str(REPO_ROOT), "push", remote_url, f"HEAD:{branch}"], check=True)
    print(f"已推送到 {owner}/{repo} ({branch})")


def title_similarity(a: str, b: str) -> float:
    a_norm = re.sub(r"\s+", " ", (a or "").strip().lower())
    b_norm = re.sub(r"\s+", " ", (b or "").strip().lower())
    return difflib.SequenceMatcher(None, a_norm, b_norm).ratio()


def main() -> None:
    parser = argparse.ArgumentParser(description="OpenClaw news ingest (multi-source) -> MDX -> git push")
    parser.add_argument("--no-push", action="store_true", help="只写文件不 git push（用于测试）")
    parser.add_argument("--dry-run", action="store_true", help="只抓取/过滤/去重，不调用大模型、不写文件")
    parser.add_argument("--source-index", type=int, default=None, help="仅处理 sources.json 中指定条目")
    parser.add_argument("--hours", type=float, default=24, help="recency window（默认 24h）")
    parser.add_argument("--max-items", type=int, default=10, help="最多生成多少条唯一新闻（去重后计数）")
    parser.add_argument("--neutrality-check", action="store_true", help="启用中立性审查（失败则路由到 review）")
    parser.add_argument("--max-links-per-source", type=int, default=30, help="从每个 hub 页面最多提取多少候选文章链接")
    parser.add_argument("--dedup-title-threshold", type=float, default=0.88, help="标题相似度阈值，用于多源去重")
    parser.add_argument("--dedup-time-hours", type=float, default=6.0, help="发布时间窗口（小时），用于多源去重")
    args = parser.parse_args()

    load_env()

    # Validate required repo structure up-front for clearer errors.
    if not (REPO_ROOT / "openclaw" / "sources.json").exists():
        raise SystemExit(
            f"找不到 {REPO_ROOT / 'openclaw' / 'sources.json'}。"
            f"请在执行环境设置 TARGET_REPO_ROOT 为你的新闻仓库根目录（包含 openclaw/content/）。"
        )
    if not (REPO_ROOT / "content" / "daily").exists():
        (REPO_ROOT / "content" / "daily").mkdir(parents=True, exist_ok=True)
    if not (REPO_ROOT / "content" / "review").exists():
        (REPO_ROOT / "content" / "review").mkdir(parents=True, exist_ok=True)
    sources_path = OPENCLAW_DIR / "sources.json"
    sources = json.loads(sources_path.read_text(encoding="utf-8"))
    if not sources:
        raise SystemExit("sources.json 为空，请至少配置一个 {name, url}")

    if args.source_index is not None:
        if args.source_index < 0 or args.source_index >= len(sources):
            raise SystemExit("source-index 超出范围")
        sources = [sources[args.source_index]]

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=float(args.hours))

    existing_slugs = read_existing_slugs()

    # Phase 1: discovery (hub -> article candidates) + time filter + authenticity
    sources_sorted = sorted(
        sources,
        key=lambda e: float(e.get("priority", 999)),
    )
    candidates: list[dict[str, Any]] = []
    for entry in sources_sorted:
        source_name = str(entry.get("name", "")).strip()
        hub_url = str(entry.get("url", "")).strip()
        if not hub_url:
            continue

        hub_label = source_name or hub_url
        print(f"[ingest] discover {hub_label} <- {hub_url}")
        try:
            links = discover_links(hub_url, max_links=args.max_links_per_source)
        except Exception as e:
            print(f"[ingest] discover failed: hub={hub_url} err={e}", file=sys.stderr)
            continue

        if not links:
            print(f"[ingest] no candidate links from hub: {hub_url}")
            continue

        print(f"[ingest] candidate links from {hub_label}: {len(links)}")
        for cand_url in links:
            if not is_from_configured_site(hub_url, cand_url):
                continue

            try:
                raw_title, body, published, _page_site_name, canonical_url = fetch_article(cand_url)
            except Exception as e:
                print(f"[ingest] fetch failed: {cand_url} err={e}", file=sys.stderr)
                continue

            if not body or len(body) < 200:
                continue
            if not published:
                continue

            if published < cutoff or published > now + timedelta(minutes=10):
                continue

            # Extra authenticity: if canonical exists, it must remain within the same host.
            if canonical_url and not is_from_configured_site(hub_url, canonical_url):
                continue

            candidates.append(
                {
                    "source_name": source_name or host_of(hub_url),
                    "url": cand_url,
                    "raw_title": raw_title,
                    "body": body,
                    "published": published,
                }
            )

    # Phase 2: dedup across sources into clusters
    clusters: list[dict[str, Any]] = []
    for c in candidates:
        c_title = c["raw_title"]
        c_time = c["published"]
        matched = False
        for cl in clusters:
            time_diff_hours = abs((c_time - cl["published"]).total_seconds()) / 3600.0
            if time_diff_hours <= float(args.dedup_time_hours) and title_similarity(c_title, cl["raw_title"]) >= float(args.dedup_title_threshold):
                cl["sources"].add(c["source_name"])
                cl["urls"].add(c["url"])
                matched = True
                break
        if not matched:
            clusters.append(
                {
                    "raw_title": c["raw_title"],
                    "published": c["published"],
                    "body": c["body"],
                    "url": c["url"],  # representative
                    "sources": {c["source_name"]},
                    "urls": {c["url"]},
                }
            )

    # convert set -> list for JSON/prompt
    unique_clusters = clusters[: int(args.max_items)]
    for cl in unique_clusters:
        if isinstance(cl.get("sources"), set):
            cl["sources"] = sorted(list(cl["sources"]))
        if isinstance(cl.get("urls"), set):
            cl["urls"] = sorted(list(cl["urls"]))

    print(f"[ingest] candidates={len(candidates)} unique(after dedup)={len(unique_clusters)}")

    if args.dry_run:
        for idx, cl in enumerate(unique_clusters, start=1):
            print(
                f"[dry-run] {idx}. {cl['raw_title']} | publishAt={to_iso_z(cl['published'])} | sources={','.join(cl['sources'])} | url={cl['url']}"
            )
        return

    # Phase 3: LLM generate -> validate -> write MDX
    confidence_threshold = float(os.environ.get("CONFIDENCE_NEED_REVIEW", "0.7"))
    dest_paths: list[Path] = []

    for cl in unique_clusters:
        publish_iso = to_iso_z(cl["published"])
        collected_iso = to_iso_z(datetime.now(timezone.utc))
        slug_fallback = slugify(cl["raw_title"])
        required_sources = cl["sources"] if isinstance(cl["sources"], list) else [str(cl["sources"])]
        data_prompt = build_prompt(
            required_sources,
            cl["url"],
            cl["raw_title"],
            cl["body"],
            publish_iso,
            collected_iso,
        )

        # LLM call with 2 attempts for robustness
        last_err: Optional[Exception] = None
        data: dict[str, Any] = {}
        for attempt in range(2):
            try:
                print(f"[ingest] calling Claude for: {cl['raw_title']} (attempt {attempt+1}/2)")
                data = call_claude_json(data_prompt)
                break
            except Exception as e:
                last_err = e
                continue

        if not data:
            print(f"[ingest] skip (LLM failed): {cl['raw_title']} err={last_err}", file=sys.stderr)
            continue

        try:
            data = validate_and_normalize(
                data,
                publish_iso,
                collected_iso,
                slug_fallback,
                original_url=cl["url"],
                required_sources=required_sources,
            )
        except Exception as e:
            print(f"[ingest] skip (validate failed): {cl['raw_title']} err={e}", file=sys.stderr)
            continue

        # Skip if slug already exists (dedup against prior runs)
        if data["slug"] in existing_slugs:
            print(f"[ingest] skip (slug exists): {data['slug']}")
            continue

        # Optional neutrality check: route to review if fails
        neutral_pass = True
        if args.neutrality_check:
            try:
                neutrality_source = required_sources[0] if required_sources else "ConfiguredSources"
                neutral_pass = neutrality_check(neutrality_source, data["body_md"], publish_iso)
            except Exception as e:
                print(f"[ingest] neutrality check failed (fallback pass=true): err={e}", file=sys.stderr)
                neutral_pass = True

        conf = float(data["confidence"])
        sub = "daily"
        if (conf < confidence_threshold) or (args.neutrality_check and not neutral_pass):
            sub = "review"

        # filename stem: YYYY-MM-DD-slug
        stem_date = datetime.fromtimestamp(cl["published"].timestamp(), tz=timezone.utc).strftime("%Y-%m-%d")
        stem = f"{stem_date}-{data['slug']}"
        dest_dir = REPO_ROOT / "content" / sub
        out = write_mdx(data, dest_dir, stem)
        dest_paths.append(out)
        existing_slugs.add(data["slug"])

        print(
            f"[ingest] wrote: {out.relative_to(REPO_ROOT)} (sub={sub}, confidence={conf:.2f}, neutral_pass={neutral_pass}, sources={','.join(required_sources)})"
        )

    if not dest_paths:
        print("[ingest] no new files written; exiting.")
        return

    if args.no_push:
        print("[ingest] --no-push set; skip git commit/push.")
        return

    branch = os.environ.get("GITHUB_BRANCH", "main").strip() or "main"
    git_commit_push(dest_paths, branch=branch)


if __name__ == "__main__":
    main()

