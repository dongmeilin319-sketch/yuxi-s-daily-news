import { NextResponse } from "next/server";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求体无效" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email ?? "").trim()
      : "";

  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ ok: false, message: "请输入有效邮箱" }, { status: 400 });
  }

  const webhook = process.env.SUBSCRIBE_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "ai-intelligence-hub", at: new Date().toISOString() }),
      });
    } catch {
      return NextResponse.json({ ok: false, message: "订阅服务暂不可用" }, { status: 502 });
    }
  }

  return NextResponse.json({
    ok: true,
    message: webhook ? "订阅成功" : "已记录（占位模式，可配置 SUBSCRIBE_WEBHOOK_URL 接入实际服务）",
  });
}
