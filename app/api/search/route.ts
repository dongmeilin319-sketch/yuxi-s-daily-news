import { NextResponse } from "next/server";
import { searchAllContent } from "@/lib/global-search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

  const results = searchAllContent(q, limit);
  return NextResponse.json({ q, total: results.length, results });
}
