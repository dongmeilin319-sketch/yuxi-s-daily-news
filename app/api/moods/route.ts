import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import type { MoodId } from "@/lib/home-mood-calendar";
import { isValidMoodId } from "@/lib/home-mood-calendar";
import { listUserMoodsInMonth, setUserDailyMood } from "@/lib/moods-store";
import { userHasPagePermission } from "@/lib/permissions";
import { isDbUnavailableError } from "@/lib/users-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 });
  }
  if (!userHasPagePermission(session.username, session.permissions, "schedule")) {
    return NextResponse.json({ ok: false, message: "无日程权限" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(searchParams.get("month") ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ ok: false, message: "请提供合法 year、month" }, { status: 400 });
  }

  try {
    // 心情仅查询当前登录账号 user_id（与其它账号隔离）
    const rows = await listUserMoodsInMonth(session.id, year, month);
    const moods: Record<string, MoodId> = {};
    for (const r of rows) moods[r.dateKey] = r.moodId;
    return NextResponse.json({ ok: true, moods, rows });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: "数据库未配置或不可用" }, { status: 503 });
    }
    throw e;
  }
}

export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 });
  }
  if (!userHasPagePermission(session.username, session.permissions, "schedule")) {
    return NextResponse.json({ ok: false, message: "无日程权限" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    date?: string;
    mood?: string | null;
  };
  const date = (body.date ?? "").trim();
  const moodRaw = body.mood;

  if (!date) {
    return NextResponse.json({ ok: false, message: "缺少 date" }, { status: 400 });
  }

  let mood: MoodId | null;
  if (moodRaw === null || moodRaw === undefined || moodRaw === "") {
    mood = null;
  } else if (typeof moodRaw === "string" && isValidMoodId(moodRaw)) {
    mood = moodRaw;
  } else {
    return NextResponse.json({ ok: false, message: "无效的心情类型" }, { status: 400 });
  }

  try {
    await setUserDailyMood(session.id, date, mood);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    if (msg.includes("Invalid date")) {
      return NextResponse.json({ ok: false, message: "日期不合法" }, { status: 400 });
    }
    if (isDbUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: "数据库未配置或不可用" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
