import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdminUsername } from "@/lib/permissions";
import { isDbUnavailableError, listSiteUsers } from "@/lib/users-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionUser();
  if (!session?.username || !isAdminUsername(session.username)) {
    return NextResponse.json({ ok: false, message: "无权限" }, { status: 403 });
  }
  try {
    const users = await listSiteUsers();
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: "数据库未配置或不可用" }, { status: 503 });
    }
    throw e;
  }
}
