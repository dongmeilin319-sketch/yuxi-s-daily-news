import { NextResponse } from "next/server";

export async function GET() {
  // Phase 1: 先用占位接口验证 Vercel Cron 打通，后续接入 OpenClaw 内容流水线。
  return NextResponse.json({
    ok: true,
    message: "Daily cron endpoint is alive.",
    now: new Date().toISOString(),
  });
}
