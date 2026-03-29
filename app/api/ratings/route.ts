import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRatingsByUserAndSlugs, setNewsRating } from "@/lib/ratings-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ratings: {} });

  const { searchParams } = new URL(req.url);
  const slugsRaw = (searchParams.get("slugs") ?? "").trim();
  const slugs = slugsRaw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (slugs.length === 0) return NextResponse.json({ ratings: {} });

  let ratings: Map<string, number>;
  try {
    ratings = await getRatingsByUserAndSlugs(user.id, slugs);
  } catch {
    return NextResponse.json({ ratings: {} });
  }
  return NextResponse.json({
    ratings: Object.fromEntries(ratings.entries()),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "请先登录后评分" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    rating?: number | null;
  };
  const slug = (body.slug ?? "").trim();
  const rating = body.rating ?? null;
  if (!slug) {
    return NextResponse.json({ ok: false, message: "缺少 slug" }, { status: 400 });
  }

  try {
    await setNewsRating(user.id, slug, rating);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "评分保存失败";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
