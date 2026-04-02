import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isValidYmdKey } from "@/lib/moods-store";
import { listUserScheduleNotesInMonth, setUserScheduleNote } from "@/lib/schedule-notes-store";
import { isDbUnavailableError } from "@/lib/users-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, message: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(searchParams.get("month") ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ ok: false, message: "请提供合法 year、month" }, { status: 400 });
  }

  try {
    const notes = await listUserScheduleNotesInMonth(session.id, year, month);
    return NextResponse.json({ ok: true, notes });
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

  const body = (await req.json().catch(() => ({}))) as { date?: string; body?: string };
  const date = (body.date ?? "").trim();
  const raw = typeof body.body === "string" ? body.body : "";

  if (!date) {
    return NextResponse.json({ ok: false, message: "缺少 date" }, { status: 400 });
  }
  if (!isValidYmdKey(date)) {
    return NextResponse.json({ ok: false, message: "日期不合法" }, { status: 400 });
  }

  try {
    await setUserScheduleNote(session.id, date, raw);
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
