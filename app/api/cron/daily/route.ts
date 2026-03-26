import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return true;
  }
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const alt = request.headers.get("x-cron-secret");
  if (alt === secret) {
    return true;
  }
  return false;
}

/**
 * 健康检查 / Vercel Cron 入口。
 * 设置 CRON_SECRET 后，须携带 `Authorization: Bearer <CRON_SECRET>`（Vercel Cron 会自动带上）。
 * 内容抓取与 MDX 写入由 GitHub Actions 或本地 `openclaw/run_once.py` 执行，不在此路由内跑 Python。
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }
  return NextResponse.json({
    ok: true,
    message: "Daily cron endpoint is alive. Run openclaw/run_once.py or a GitHub workflow to ingest content.",
    now: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }
  return NextResponse.json({
    ok: true,
    message: "Accepted. Wire GitHub Actions (workflow_dispatch) here later if needed.",
    now: new Date().toISOString(),
  });
}
