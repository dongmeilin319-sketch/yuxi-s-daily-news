import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { searchAllContent } from "@/lib/global-search";
import { userHasPagePermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 });
  }
  if (!userHasPagePermission(session.username, session.permissions, "search")) {
    return NextResponse.json({ ok: false, message: "无搜索权限" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

  const results = searchAllContent(q, limit);
  return NextResponse.json({ q, total: results.length, results });
}
